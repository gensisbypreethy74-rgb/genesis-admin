'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    exact: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
  },
  {
    name: 'Products',
    href: '/dashboard/products',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
  },
  {
    name: 'Categories',
    href: '/dashboard/categories',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
  },
  {
    name: 'Orders',
    href: '/dashboard/orders',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
  },
  {
    name: 'Banners',
    href: '/dashboard/banners',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
  },
  {
    name: 'Customers',
    href: '/dashboard/customers',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function SidebarNav({ onNavClick, onLogout }: { onNavClick: () => void; onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="px-5 space-y-2">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavClick}
                className={`flex items-center justify-between px-4 py-[14px] rounded-[14px] transition-colors ${isActive
                    ? 'bg-[#5b3db8] text-white font-semibold'
                    : 'text-slate-400 hover:text-white font-medium'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                  <span className="text-[15px]">{item.name}</span>
                </div>
                {isActive && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-800/50">
        <button
          onClick={onLogout}
          className="flex items-center gap-4 text-[#f87171] hover:text-red-300 transition-colors font-semibold text-[15px] px-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin-login');
  };

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (always visible, in-flow) ===== */}
      <aside className="hidden lg:flex w-[260px] bg-[#372a5e] text-slate-300 flex-col shrink-0">
        <div className="flex items-center gap-4 h-[100px] px-8 shrink-0">
          <div className="w-[42px] h-[42px] rounded-xl bg-[#5b3db8] flex items-center justify-center text-white font-bold text-xl shrink-0">
            N
          </div>
          <h1 className="text-[17px] font-bold text-white tracking-wide">NEOKART ADMIN</h1>
        </div>
        <SidebarNav onNavClick={() => { }} onLogout={handleLogout} />
      </aside>

      {/* ===== MOBILE SIDEBAR (fixed overlay drawer) ===== */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#372a5e] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between h-[72px] px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[42px] h-[42px] rounded-xl bg-[#5b3db8] flex items-center justify-center text-white font-bold text-xl shrink-0">
              N
            </div>
            <h1 className="text-[17px] font-bold text-white tracking-wide">NEOKART ADMIN</h1>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <SidebarNav onNavClick={onClose} onLogout={handleLogout} />
      </aside>
    </>
  );
}
