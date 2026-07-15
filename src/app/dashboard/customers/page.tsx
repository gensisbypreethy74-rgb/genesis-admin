'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

interface CustomerOrder {
  _id: string;
  total: number;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: { quantity: number; price: number; product?: { name?: string } }[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Order-history modal state
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/v1/users/admin/customers`, getAuthHeaders());
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (id: string) => {
    try {
      const res = await axios.put(`${API_URL}/v1/users/admin/customers/${id}/toggle-status`, {}, getAuthHeaders());
      if (res.data.success) {
        setCustomers(customers.map(customer => 
          customer._id === id ? { ...customer, isActive: !customer.isActive } : customer
        ));
      }
    } catch (err) {
      console.error('Failed to toggle customer status', err);
      alert('Failed to update customer status');
    }
  };

  const openOrderHistory = async (customer: Customer) => {
    setViewingCustomer(customer);
    setOrders([]);
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/v1/payments/admin/customers/${customer._id}/orders`, getAuthHeaders());
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customer orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusStyle = (isActive: boolean) => {
    return isActive
      ? 'bg-[#dcfce7] text-[#16a34a]'
      : 'bg-[#fee2e2] text-[#dc2626]';
  };

  const getOrderStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-[#dcfce7] text-[#16a34a]';
      case 'shipped': return 'bg-[#dbeafe] text-[#2563eb]';
      case 'cancelled': return 'bg-[#fee2e2] text-[#dc2626]';
      default: return 'bg-[#fef9c3] text-[#ca8a04]'; // processing
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto mt-2 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5b3db8]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 transition-all duration-300">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[16px] font-medium text-slate-800">Customer Management</h2>
          <span className="text-[13px] text-slate-500 font-medium">{customers.length} customers</span>
        </div>
        
        {customers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium">No customers yet</p>
            <p className="text-sm mt-2">Customers will appear here once they register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[25%]">Name</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[30%]">Email</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[15%]">Phone</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Joined</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{customer.name}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{customer.email}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium">{customer.phone || '—'}</td>
                    <td className="py-5 px-6 text-[14px] text-slate-500 font-medium">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(customer.isActive)}`}>
                        {customer.isActive ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openOrderHistory(customer)}
                          className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center bg-[#eef2ff] text-[#5b3db8] hover:bg-[#e0e7ff] transition-colors"
                          title="View Order History"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        </button>
                        <button
                          onClick={() => toggleCustomerStatus(customer._id)}
                          className={`w-[34px] h-[34px] rounded-[8px] flex items-center justify-center transition-colors ${
                            customer.isActive
                              ? 'bg-[#fef2f2] text-[#ef4444] hover:bg-red-100'
                              : 'bg-[#dcfce7] text-[#16a34a] hover:bg-green-100'
                          }`}
                          title={customer.isActive ? 'Block Customer' : 'Unblock Customer'}
                        >
                          {customer.isActive ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Order History Modal ── */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewingCustomer(null)}
          />
          <div className="relative bg-white rounded-[24px] w-full max-w-2xl max-h-[85vh] shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900">Order History</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">{viewingCustomer.name} · {viewingCustomer.email}</p>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5b3db8]"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <p className="text-[15px] font-medium">No orders yet</p>
                  <p className="text-[13px] mt-1">This customer hasn&apos;t placed any orders.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {orders.map((order) => (
                    <div key={order._id} className="border border-slate-100 rounded-[16px] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="text-[12px] text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod?.toUpperCase()}</p>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getOrderStatusStyle(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-[13px]">
                            <span className="text-slate-600">{item.product?.name || 'Product'} × {item.quantity}</span>
                            <span className="text-slate-900 font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
                        <span className="text-[13px] font-bold text-slate-900">Total</span>
                        <span className="text-[14px] font-bold text-slate-900">₹{order.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
