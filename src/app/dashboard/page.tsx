'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface RecentOrder {
  _id: string;
  user?: { name: string; email: string };
  total: number;
  orderStatus: string;
  createdAt: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalBanners: number;
  totalCustomers: number;
  recentOrders: RecentOrder[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get(`${API_URL}/v1/dashboard/stats`, {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-[#dcfce7] text-[#16a34a]';
      case 'processing': return 'bg-[#e0e7ff] text-[#4f46e5]';
      case 'shipped': return 'bg-[#dbeafe] text-[#5b3db8]';
      case 'cancelled': return 'bg-[#fee2e2] text-[#dc2626]';
      default: return 'bg-slate-100 text-slate-600';
    }
  };
  console.log("stats : ", stats)
  console.log("recentOrders : ", stats?.recentOrders)
  console.log("total revenue : ", stats?.totalRevenue)
  console.log("total orders : ", stats?.totalOrders)
  console.log("total products : ", stats?.totalProducts)
  console.log("total categories : ", stats?.totalCategories)
  console.log("total banners : ", stats?.totalBanners)
  console.log("total customers : ", stats?.totalCustomers)
  const cards = [
    {
      label: 'Total Revenue',
      value: stats ? `₹${(stats?.totalRevenue || 0).toLocaleString()}` : '...',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      ),
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]'
    },
    {
      label: 'Total Orders',
      value: stats ? String(stats.totalOrders) : '...',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
      ),
      iconBg: 'bg-[#e0f2fe]',
      iconColor: 'text-[#0284c7]'
    },
    {
      label: 'Products',
      value: stats ? String(stats.totalProducts) : '...',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      ),
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]'
    },
    {
      label: 'Categories',
      value: stats ? String(stats.totalCategories) : '...',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
      ),
      iconBg: 'bg-[#f3e8ff]',
      iconColor: 'text-[#9333ea]'
    },
    {
      label: 'Banners',
      value: stats ? String(stats.totalBanners) : '...',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
      ),
      iconBg: 'bg-[#fae8ff]',
      iconColor: 'text-[#c026d3]'
    },
    {
      label: 'Customers',
      value: stats ? String(stats.totalCustomers) : '...',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      ),
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]'
    }
  ];

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto mt-2 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5b3db8]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto mt-2 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-[24px] p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-6 border border-slate-100/60">
            <div className={`w-[60px] h-[60px] rounded-[18px] ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
              {card.icon}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[16px] font-semibold text-slate-500">{card.label}</span>
              <span className="text-[32px] font-bold text-[#111827] leading-none">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-[24px] p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-bold text-[#111827]">Recent Transactions</h2>
          <a href="/dashboard/orders" className="text-[15px] font-bold text-[#5b3db8] hover:text-[#4a2f96]">View All</a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 rounded-l-[12px] w-[15%]">Order ID</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 w-[25%]">Customer</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 w-[20%]">Amount</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 w-[20%]">Status</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 rounded-r-[12px] w-[20%]">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827]">#{order._id.substring(0, 8)}</td>
                    <td className="py-5 px-6 text-[15px] font-medium text-slate-600">{order.user?.name || 'Unknown'}</td>
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827]">₹{order.total.toLocaleString()}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold uppercase ${getStatusStyle(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-[15px] font-medium text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No recent transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
