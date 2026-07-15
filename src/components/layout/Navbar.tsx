'use client';

import { usePathname } from 'next/navigation';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  
  let title = 'Dashboard';
  if (pathname.includes('/products')) title = 'Products';
  else if (pathname.includes('/categories')) title = 'Categories';
  else if (pathname.includes('/orders')) title = 'Orders';
  else if (pathname.includes('/banners')) title = 'Banners';
  else if (pathname.includes('/customers')) title = 'Customers';

  return (
    <header className="bg-white border-b border-slate-200 h-[64px] lg:h-[100px] flex items-center justify-between px-4 sm:px-6 lg:px-8 z-40 sticky top-0 shrink-0">
      <div className="flex items-center gap-3 lg:gap-0">
        {/* Hamburger menu button (mobile only) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors -ml-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
        </button>

        <div className="flex flex-col justify-center">
          <h1 className="text-[22px] sm:text-[28px] lg:text-[32px] font-bold text-slate-900 tracking-tight leading-tight">{title}</h1>
          <p className="text-[12px] sm:text-[13px] lg:text-[15px] text-slate-500 font-medium mt-0.5 lg:mt-1 hidden sm:block">Welcome back, System Admin</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-[14px] bg-[#5b3db8] text-white flex items-center justify-center text-lg lg:text-xl font-bold shadow-sm">
            S
          </div>
          <div className="flex-col hidden sm:flex">
            <span className="text-[15px] font-bold text-slate-900 leading-tight">System Admin</span>
            <span className="text-[13px] text-slate-500 font-medium">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
