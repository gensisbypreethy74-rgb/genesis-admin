'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Pencil, Shirt, Trash2 } from 'lucide-react';
import { api, toastApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Pagination,
  Reveal,
  SearchInput,
  SkeletonTable,
  StatusBadge,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Thumb,
  Tr,
} from '@/components/ui';
import ProductForm from './ProductForm';
import type { ICategory, IProduct } from './types';

const PAGE_SIZE = 20;

/**
 * The full pieces catalogue with add / edit / delete, reusing ProductForm. One
 * component, rendered by both the "Pieces" page and the Moment admin — products
 * are a single global catalogue, so there's one manager, not two copies.
 */
export default function PiecesManager() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  // Kept apart from "empty": an outage must not read as "No pieces yet".
  const [loadFailed, setLoadFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<IProduct | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<IProduct | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      // `all=1`: the public list hides Archived pieces, and the studio must
      // still see them to edit or restore them.
      const res = await api.get('/products', { params: { all: 1 } });
      if (res.data.success) {
        setProducts(res.data.data);
        setLoadFailed(false);
      }
    } catch (err) {
      toastApiError(err, 'Could not load pieces.');
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      toastApiError(err, 'Could not load categories.');
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchProducts(), fetchCategories()]);
    })();
  }, []);

  const afterChange = () => {
    fetchProducts();
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => p.name.toLowerCase().includes(needle));
  }, [products, query]);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (product: IProduct) => {
    setEditing(product);
    setDrawerOpen(true);
  };
  const askDelete = (product: IProduct) => {
    setDeleteTarget(product);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/products/${deleteTarget._id}`);
      if (res.data.success) {
        toast.success('Product deleted successfully');
        afterChange();
        setDeleteOpen(false);
      } else {
        toast.error(res.data.message || 'Failed to delete product');
      }
    } catch (err) {
      toastApiError(err, 'Error deleting product');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Reveal>
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <SearchInput
              value={query}
              onChange={handleQueryChange}
              placeholder="Search pieces…"
              className="w-full max-w-xs"
            />
            <div className="flex items-center gap-4 shrink-0">
              <p className="eyebrow-tight text-faint hidden sm:block whitespace-nowrap">
                {filtered.length} {filtered.length === 1 ? 'Piece' : 'Pieces'}
              </p>
              <Button variant="solid" size="sm" onClick={openAdd}>
                Add Piece
              </Button>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : loadFailed && products.length === 0 ? (
            <EmptyState
              eyebrow="Unavailable"
              title="Could not load pieces"
              message="The server didn't respond. Nothing has been lost — try again in a moment."
              icon={<Shirt size={18} />}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    fetchProducts();
                  }}
                >
                  Retry
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            query.trim() ? (
              <EmptyState
                eyebrow="No matches"
                title="Nothing found"
                message={`No piece matches “${query.trim()}”. Try a different name.`}
                icon={<Shirt size={18} />}
                action={
                  <Button variant="outline" size="sm" onClick={() => handleQueryChange('')}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No pieces yet"
                message="Add your first piece to begin building the collection."
                icon={<Shirt size={18} />}
                action={
                  <Button variant="solid" size="sm" onClick={openAdd}>
                    Add Piece
                  </Button>
                }
              />
            )
          ) : (
            <Table>
              <THead>
                <Th className="w-px">
                  <span className="sr-only">Image</span>
                </Th>
                <Th>Name</Th>
                <Th className="hidden md:table-cell">Garment</Th>
                <Th align="right">Price</Th>
                <Th className="hidden sm:table-cell">Status</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </THead>
              <TBody>
                {rows.map((product) => {
                  const variant = product.variants?.[0];
                  const hasOldPrice = !!(variant?.oldPrice && variant.oldPrice > 0);
                  const secondary = product.garmentType || product.collectionName;

                  return (
                    <Tr key={product._id} muted={product.status === 'Archived'}>
                      <Td>
                        <Thumb
                          src={[
                            ...(product.images || []),
                            ...(product.variants || []).flatMap((v) => v.images || []),
                          ]}
                          alt={product.name}
                          className="w-11 h-11"
                        />
                      </Td>

                      <Td>
                        <span className="block font-sans text-[13px] text-ink leading-snug">
                          {product.name}
                        </span>
                        <span className="block font-sans text-[12px] text-faint mt-0.5 md:hidden">
                          {product.category}
                        </span>
                        {/* The Status column is hidden on phones. */}
                        {product.status === 'Archived' && (
                          <StatusBadge status="Archived" className="mt-1.5 sm:hidden" />
                        )}
                      </Td>

                      <Td className="hidden md:table-cell">
                        <span className="block font-sans text-[13px] text-muted leading-snug">
                          {secondary || product.category}
                        </span>
                        {secondary && (
                          <span className="block font-sans text-[12px] text-faint mt-0.5">
                            {product.category}
                          </span>
                        )}
                      </Td>

                      <Td align="right">
                        {variant ? (
                          <>
                            <span className="block font-display font-light text-[15px] text-ink tabular-nums">
                              {formatINR(variant.price)}
                            </span>
                            {hasOldPrice && (
                              <span className="block font-sans text-[12px] text-faint line-through tabular-nums">
                                {formatINR(variant.oldPrice as number)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>

                      <Td className="hidden sm:table-cell">
                        {product.status ? (
                          <StatusBadge status={product.status} />
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>

                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton label={`Edit ${product.name}`} onClick={() => openEdit(product)}>
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton
                            label={`Delete ${product.name}`}
                            tone="danger"
                            onClick={() => askDelete(product)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}

          {!loading && filtered.length > 0 && (
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              itemLabel="pieces"
            />
          )}
        </Card>
      </Reveal>

      <AnimatePresence>
        {drawerOpen && (
          <ProductForm
            key={editing?._id ?? 'new'}
            product={editing}
            categories={categories}
            onClose={() => setDrawerOpen(false)}
            onSaved={() => {
              setDrawerOpen(false);
              afterChange();
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete this piece?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the collection. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </>
  );
}
