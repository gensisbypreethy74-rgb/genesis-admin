'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, PackageSearch } from 'lucide-react';
import { api, toastApiError } from '@/lib/api';
import { formatINR, formatDate, formatDateTime, shortId } from '@/lib/format';
import {
  Button,
  Card,
  ConfirmDialog,
  PageHeader,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  Modal,
  Select,
  StatusBadge,
  Spinner,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  Reveal,
  Thumb,
  IconButton,
} from '@/components/ui';

interface OrderItem {
  /** Populated product, or null once the product has been deleted. */
  product: {
    _id: string;
    name: string;
    images: string[];
    variants?: { volume: string; price: number }[];
  } | null;
  /** Snapshots taken at purchase. Legacy orders may lack name/image. */
  name?: string;
  image?: string;
  size?: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  shippingAddress: {
    street?: string;
    apartment?: string;
    landmark?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  /** COD only: paid online up front, and still to collect at the door. */
  advanceAmount?: number;
  balanceAmount?: number;
  /** Paid, but a size ran out — the studio must contact the customer. */
  stockShortfall?: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

/**
 * The backend's `orderStatus` enum — see genesis-backend `src/models/Order.ts`.
 * `pending` is deliberately absent: it is a *payment* status, never an order
 * status.
 */
const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Moves the server accepts (it 400s anything else). shipped → processing undoes
 * an accidental "shipped". Delivered and cancelled are final.
 */
const NEXT_STATUSES: Record<string, readonly string[]> = {
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled', 'processing'],
  delivered: [],
  cancelled: [],
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A confirm-first action: status changes that email the customer, refunds. */
interface PendingAction {
  orderId: string;
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'danger' | 'solid';
  run: () => Promise<void>;
}

/** Delivered and cancelled are done with — the storefront dims terminal records. */
const TERMINAL_STATUSES: readonly string[] = ['delivered', 'cancelled'];

const PAGE_SIZE = 20;

/** Eyebrow-over-value: the system's smallest unit of labelled data. */
function Detail({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow-tight text-faint mb-1.5">{label}</p>
      <div className="font-sans text-[13px] text-ink leading-relaxed break-words">
        {children}
      </div>
    </div>
  );
}

/** A titled block inside the detail modal, opened by a hairline. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <p className="eyebrow text-bronze-deep mb-4">{title}</p>
      {children}
    </section>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);
  // Separate from `pending` so the dialog copy survives its exit animation.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Narrowing the results can strand you past the last page, so both filter
  // controls reset to page one. Done in the handlers rather than an effect —
  // this is a consequence of the interaction, not state to synchronise.
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeStatusFilter = (value: 'all' | OrderStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Auth headers and 401/403 handling now live in the shared client's
  // interceptors — clear session, toast, redirect — so this page no longer
  // carries its own copy.
  // No `setLoading(true)` here: it starts true, and setting it synchronously in
  // the mount effect is what the React Compiler's set-state-in-effect rule
  // (correctly) objects to. Everything below runs after the await.
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/payments/admin/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      toastApiError(err, 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The compiler can't see that every setState here lands after an await;
    // fetching on mount is the external-system sync effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  /** Fold the server's copy of an order back in (status changes can move paymentStatus too). */
  const applyUpdate = (id: string, updated: Partial<Order> | undefined, fallback: Partial<Order>) =>
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order._id === id
          ? {
              ...order,
              orderStatus: updated?.orderStatus ?? fallback.orderStatus ?? order.orderStatus,
              paymentStatus: updated?.paymentStatus ?? fallback.paymentStatus ?? order.paymentStatus,
            }
          : order
      )
    );

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (updatingOrderId === id) return; // Prevent duplicate requests

    try {
      setUpdatingOrderId(id);
      const res = await api.put(`/payments/admin/orders/${id}/status`, {
        orderStatus: newStatus,
      });

      if (res.data.success) {
        applyUpdate(id, res.data.data, { orderStatus: newStatus });
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (err) {
      // A rejected transition (400) or a race with another admin (409) carries
      // a readable message from the server.
      toastApiError(err, 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const markRefunded = async (id: string) => {
    if (updatingOrderId === id) return;
    try {
      setUpdatingOrderId(id);
      const res = await api.put(`/payments/admin/orders/${id}/payment-status`, {
        paymentStatus: 'refunded',
      });
      if (res.data.success) {
        applyUpdate(id, res.data.data, { paymentStatus: 'refunded' });
        toast.success('Marked as refunded');
      }
    } catch (err) {
      toastApiError(err, 'Could not mark the order as refunded');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Every move except the shipped → processing undo emails the customer, and
  // an email can't be unsent — so those wait for a confirm. (A focused select
  // also changes value on an arrow key in some browsers.)
  const ask = (action: PendingAction) => {
    setPending(action);
    setConfirmOpen(true);
  };

  const requestStatusChange = (order: Order, next: string) => {
    if (next === order.orderStatus) return;
    const ref = shortId(order._id);
    const run = () => handleStatusChange(order._id, next);
    const copy: Record<string, Omit<PendingAction, 'orderId' | 'run'>> = {
      shipped: {
        title: 'Mark as shipped?',
        message: `This emails the customer that order ${ref} is on its way.`,
        confirmLabel: 'Mark shipped',
        tone: 'solid',
      },
      delivered: {
        title: 'Mark as delivered?',
        message: `This emails the customer that order ${ref} has been delivered.${
          order.paymentMethod === 'cod' ? ' It also records the cash-on-delivery balance as collected.' : ''
        }`,
        confirmLabel: 'Mark delivered',
        tone: 'solid',
      },
      cancelled: {
        title: 'Cancel this order?',
        message: `This emails the customer that order ${ref} has been cancelled, and can't be undone. If they have already paid, the order is marked Refund due.`,
        confirmLabel: 'Cancel order',
        tone: 'danger',
      },
    };
    // shipped → processing sends no email, so it applies straight away.
    if (copy[next]) ask({ orderId: order._id, run, ...copy[next] });
    else void run();
  };

  const requestRefunded = (order: Order) =>
    ask({
      orderId: order._id,
      run: () => markRefunded(order._id),
      tone: 'solid',
      confirmLabel: 'Mark refunded',
      title: 'Mark as refunded?',
      message: `Only do this once the refund for order ${shortId(order._id)} has been issued from the Razorpay dashboard — this records it here; it does not send any money.`,
    });

  // Filtering stays client-side over the already-fetched list, exactly as
  // before — no new query parameters reach the API.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.orderStatus !== statusFilter) return false;
      if (!q) return true;
      // Match the raw id so both the displayed short id and a full id work.
      return (
        order._id.toLowerCase().includes(q) ||
        (order.user?.name || '').toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Derived from `orders`, not held in state, so an inline status change is
  // reflected in the open modal.
  //
  // Closing clears `detailOpen` but deliberately leaves `selectedOrder` set, so
  // the panel keeps its content while it animates out rather than blanking
  // mid-fade. (Stashing the last order in a ref would also work, but reading a
  // ref during render isn't reactive and the React Compiler rejects it.)
  const modalOrder = orders.find((o) => o._id === selectedOrder) ?? null;

  const isSearching = query.trim() !== '' || statusFilter !== 'all';

  return (
    <>
      <PageHeader
        eyebrow="Fulfilment"
        title="Orders"
        description="Every order placed through the storefront, with its payment state and progress from processing to delivery."
      />

      <Reveal>
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <SearchInput
              value={query}
              onChange={changeQuery}
              placeholder="Search by order id or customer…"
              className="sm:max-w-xs w-full"
            />
            <div className="sm:w-[190px] w-full">
              <Select
                value={statusFilter}
                onChange={(e) => changeStatusFilter(e.target.value as 'all' | OrderStatus)}
                aria-label="Filter by order status"
              >
                <option value="all">All statuses</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={20} />}
              eyebrow={isSearching ? 'No matches' : 'Nothing here yet'}
              title={isSearching ? 'No orders match' : 'No orders yet'}
              message={
                isSearching
                  ? 'Try a different order id, customer name, or status.'
                  : 'Orders will appear here once customers place them.'
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th className="hidden md:table-cell">Date</Th>
                  <Th align="right">Total</Th>
                  <Th className="hidden md:table-cell">Payment</Th>
                  <Th>Status</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </THead>
                <TBody>
                  {paged.map((order) => {
                    const updating = updatingOrderId === order._id;
                    return (
                      <Tr
                        key={order._id}
                        muted={TERMINAL_STATUSES.includes(order.orderStatus)}
                      >
                        <Td>
                          <span className="block whitespace-nowrap">
                            {shortId(order._id)}
                          </span>
                          <span className="block text-[12px] text-faint mt-0.5 whitespace-nowrap">
                            {order.items.length}{' '}
                            {order.items.length === 1 ? 'item' : 'items'}
                          </span>
                          {order.stockShortfall && (
                            <StatusBadge status="Stock issue" tone="danger" className="mt-1.5" />
                          )}
                        </Td>

                        <Td>
                          <span className="block">{order.user?.name || 'Unknown'}</span>
                          <span className="block text-[12px] text-muted mt-0.5">
                            {order.user?.email || ''}
                          </span>
                        </Td>

                        <Td className="hidden md:table-cell text-muted whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </Td>

                        <Td align="right" className="whitespace-nowrap">
                          {formatINR(order.total)}
                        </Td>

                        <Td className="hidden md:table-cell">
                          <StatusBadge status={order.paymentStatus} />
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="w-[150px]">
                              <Select
                                value={order.orderStatus}
                                onChange={(e) => requestStatusChange(order, e.target.value)}
                                disabled={updating || !NEXT_STATUSES[order.orderStatus]?.length}
                                aria-label={`Order status for ${shortId(order._id)}`}
                              >
                                {/* The current status, then only the moves the server allows. */}
                                {ORDER_STATUSES.filter(
                                  (status) =>
                                    status === order.orderStatus ||
                                    NEXT_STATUSES[order.orderStatus]?.includes(status)
                                ).map((status) => (
                                  <option key={status} value={status}>
                                    {titleCase(status)}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            {/* Reserved slot — the row must not jump while saving. */}
                            <span className="w-4 shrink-0 flex items-center justify-center">
                              {updating && <Spinner size={14} />}
                            </span>
                          </div>
                        </Td>

                        <Td align="right">
                          <IconButton
                            label={`View order ${shortId(order._id)}`}
                            onClick={() => {
                              setSelectedOrder(order._id);
                              setDetailOpen(true);
                            }}
                            className="ml-auto"
                          >
                            <Eye size={15} />
                          </IconButton>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>

              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
                itemLabel="orders"
              />
            </>
          )}
        </Card>
      </Reveal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        eyebrow="Order detail"
        title={modalOrder ? shortId(modalOrder._id) : ''}
        size="lg"
      >
        {modalOrder && (
          <div className="space-y-5">
            {modalOrder.stockShortfall && (
              <div
                role="alert"
                className="bg-danger-tint border border-danger/20 text-danger font-sans text-[13px] leading-relaxed px-4 py-3"
              >
                A size in this order sold out after it was paid for. Contact the
                customer before shipping — offer another size or a refund.
              </div>
            )}

            <Section title="Order">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail label="Order ID" className="sm:col-span-2">
                  <span className="break-all">{modalOrder._id}</span>
                </Detail>
                <Detail label="Placed">{formatDateTime(modalOrder.createdAt)}</Detail>
                <Detail label="Order status">
                  <StatusBadge status={modalOrder.orderStatus} />
                </Detail>
                <Detail label="Payment method">
                  {modalOrder.paymentMethod === 'cod' ? 'Cash on delivery' : modalOrder.paymentMethod}
                </Detail>
                <Detail label="Payment status">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={modalOrder.paymentStatus} />
                    {modalOrder.paymentStatus === 'refund_due' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestRefunded(modalOrder)}
                        loading={updatingOrderId === modalOrder._id}
                      >
                        Mark refunded
                      </Button>
                    )}
                  </div>
                </Detail>
                {modalOrder.razorpayOrderId && (
                  <Detail label="Razorpay ID" className="sm:col-span-2">
                    <span className="break-all">{modalOrder.razorpayOrderId}</span>
                  </Detail>
                )}
              </div>
            </Section>

            <Section title="Customer">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail label="Name">{modalOrder.user?.name || 'Unknown'}</Detail>
                <Detail label="Email">{modalOrder.user?.email || 'N/A'}</Detail>
                {modalOrder.user?.phone && (
                  <Detail label="Phone">{modalOrder.user.phone}</Detail>
                )}
              </div>
            </Section>

            <Section title="Shipping address">
              <address className="font-sans text-[13px] text-ink leading-relaxed not-italic">
                {modalOrder.shippingAddress?.street && (
                  <span className="block">{modalOrder.shippingAddress.street}</span>
                )}
                {modalOrder.shippingAddress?.apartment && (
                  <span className="block">{modalOrder.shippingAddress.apartment}</span>
                )}
                {modalOrder.shippingAddress?.landmark && (
                  <span className="block text-muted">
                    Near {modalOrder.shippingAddress.landmark}
                  </span>
                )}
                <span className="block">
                  {modalOrder.shippingAddress?.city}
                  {modalOrder.shippingAddress?.state
                    ? `, ${modalOrder.shippingAddress.state}`
                    : ''}
                </span>
                <span className="block">
                  {modalOrder.shippingAddress?.zipCode}
                  {modalOrder.shippingAddress?.country
                    ? `, ${modalOrder.shippingAddress.country}`
                    : ''}
                </span>
              </address>
            </Section>

            <Section title="Items">
              <ul className="divide-y divide-line -mt-1">
                {modalOrder.items.map((item, idx) => {
                  // Purchase-time snapshot first, so a since-renamed or deleted
                  // product still shows what was bought.
                  const name = item.name || item.product?.name;
                  return (
                  <li key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <Thumb
                      src={[item.image, item.product?.images?.[0]].filter((s): s is string => !!s)}
                      alt={name || 'Product'}
                      className="w-12 h-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[13px] text-ink leading-snug">
                        {name || 'Product unavailable'}
                      </p>
                      <p className="font-sans text-[12px] text-faint mt-0.5">
                        {item.size && (
                          <>
                            Size <span className="text-ink">{item.size}</span> &middot;{' '}
                          </>
                        )}
                        &times;{item.quantity}
                      </p>
                    </div>
                    <p className="font-sans text-[13px] text-ink whitespace-nowrap">
                      {formatINR(item.price)}
                    </p>
                  </li>
                  );
                })}
              </ul>
            </Section>

            <Section title="Price breakdown">
              <dl className="font-sans text-[13px]">
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="text-ink">{formatINR(modalOrder.subtotal)}</dd>
                </div>
                {modalOrder.discount > 0 && (
                  <div className="flex items-baseline justify-between py-1.5 text-success">
                    <dt>Discount</dt>
                    <dd>&minus;{formatINR(modalOrder.discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="text-ink">
                    {modalOrder.shippingFee > 0
                      ? formatINR(modalOrder.shippingFee)
                      : 'Free'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line mt-3 pt-4">
                  <dt className="eyebrow text-bronze-deep">Total</dt>
                  <dd className="font-display font-light text-2xl text-ink leading-none">
                    {formatINR(modalOrder.total)}
                  </dd>
                </div>
                {modalOrder.paymentMethod === 'cod' && (
                  <>
                    <div className="flex items-baseline justify-between pt-4 pb-1.5">
                      <dt className="text-muted">Paid online (advance)</dt>
                      <dd className="text-ink">{formatINR(modalOrder.advanceAmount ?? 0)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between py-1.5">
                      <dt className="text-ink font-medium">Collect on delivery</dt>
                      <dd className="text-ink font-medium">
                        {formatINR(modalOrder.balanceAmount ?? 0)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </Section>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await pending?.run();
          setConfirmOpen(false);
        }}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel}
        cancelLabel="Go back"
        tone={pending?.tone}
        loading={!!pending && updatingOrderId === pending.orderId}
      />
    </>
  );
}
