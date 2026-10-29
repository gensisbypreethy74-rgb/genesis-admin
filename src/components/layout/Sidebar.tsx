'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  LayoutGrid,
  Shirt,
  Layers,
  Package,
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  PenLine,
  NotebookText,
  Users,
  Mail,
  LogOut,
  X,
  Settings,
} from 'lucide-react';
import { ADMIN_TOKEN_KEY, clearAdminSession } from '@/lib/adminSession';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import { NAV_ITEMS } from './navigation';

// Icons live here rather than in navigation.ts so that module stays a plain
// route table the Navbar can read without pulling in JSX.
const ICONS = {
  dashboard: LayoutGrid,
  products: Shirt,
  categories: Layers,
  orders: Package,
  banners: ImageIcon,
  moment: Sparkles,
  founder: PenLine,
  'studio-notes': NotebookText,
  story: BookOpen,
  customers: Users,
  newsletter: Mail,
  settings: Settings,
} as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Wordmark() {
  return (
    <Link
      href="/dashboard"
      aria-label="Genesis by Preethy Studio — overview"
      className="block group"
    >
      {/* Gold on the ink sidebar — the mark's strongest ground (~7:1). */}
      <Logo tone="gold" priority className="h-[26px]" />
      <span className="block eyebrow-tight text-bronze mt-2 transition-colors duration-300 ease-editorial group-hover:text-ivory">
        Studio
      </span>
    </Link>
  );
}

function SidebarNav({
  onNavClick,
  onLogout,
}: {
  onNavClick: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 overflow-y-auto thin-scrollbar py-6 px-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.key];
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 px-4 py-3 transition-colors duration-300 ease-editorial ${
                    isActive
                      ? 'bg-ivory/[0.07] text-ivory'
                      : 'text-ivory/45 hover:text-ivory hover:bg-ivory/[0.04]'
                  }`}
                >
                  {/* Active marker: a bronze rule, not a pill or a chevron. */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-0 bottom-0 w-[2px] bg-bronze transition-opacity duration-300 ease-editorial ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icon size={16} strokeWidth={1.5} aria-hidden className="shrink-0" />
                  <span className="font-sans text-[12px] uppercase tracking-[0.14em]">
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-ivory/10 shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-ivory/45 hover:text-ivory hover:bg-ivory/[0.04] transition-colors duration-300 ease-editorial"
        >
          <LogOut size={16} strokeWidth={1.5} aria-hidden className="shrink-0" />
          <span className="font-sans text-[12px] uppercase tracking-[0.14em]">
            Sign Out
          </span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const handleLogout = () => {
    // Best-effort server sign-out: revokes every token issued to this admin.
    // Plain fetch rather than `api` so an already-expired token's 401 can't fire
    // the shared "session expired" toast on top of a deliberate sign-out. Not
    // awaited: the router navigation below is client-side, so it keeps running.
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      fetch(`${api.defaults.baseURL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearAdminSession();
    router.push('/admin-login');
  };

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* -- Desktop: in-flow, always visible ------------------------------- */}
      <aside className="hidden lg:flex w-[248px] bg-ink flex-col shrink-0">
        <div className="h-[76px] px-6 flex items-center shrink-0 border-b border-ivory/10">
          <Wordmark />
        </div>
        <SidebarNav onNavClick={() => {}} onLogout={handleLogout} />
      </aside>

      {/* -- Mobile: overlay drawer ----------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={reduce ? { opacity: 0 } : { x: '-100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[248px] bg-ink flex flex-col"
            >
              <div className="h-[68px] px-6 flex items-center justify-between shrink-0 border-b border-ivory/10">
                <Wordmark />
                <button
                  onClick={onClose}
                  aria-label="Close navigation"
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-ivory/20 text-ivory/60 hover:text-ivory hover:border-ivory/50 transition-colors duration-300 ease-editorial"
                >
                  <X size={15} />
                </button>
              </div>
              <SidebarNav onNavClick={onClose} onLogout={handleLogout} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
