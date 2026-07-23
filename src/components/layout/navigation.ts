/**
 * One route table for the studio.
 *
 * The Sidebar and the Navbar both derive from this. Navbar previously carried
 * its own if/else `pathname.includes()` chain to title each page, which had
 * silently fallen out of sync — `/dashboard/newsletter` had no case, so that
 * page rendered with the title "Dashboard".
 */

export type NavKey =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'banners'
  | 'moment'
  | 'story'
  | 'customers'
  | 'newsletter';

export interface NavItem {
  key: NavKey;
  /** Sidebar label. */
  name: string;
  href: string;
  /** Page title + the eyebrow above it. */
  title: string;
  eyebrow: string;
  /** Match the path exactly rather than by prefix (only /dashboard needs this). */
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    name: 'Overview',
    href: '/dashboard',
    title: 'Overview',
    eyebrow: 'The Studio',
    exact: true,
  },
  {
    key: 'products',
    name: 'Pieces',
    href: '/dashboard/products',
    title: 'Pieces',
    eyebrow: 'The Edit',
  },
  {
    key: 'categories',
    name: 'Categories',
    href: '/dashboard/categories',
    title: 'Categories',
    eyebrow: 'The Edit',
  },
  {
    key: 'orders',
    name: 'Orders',
    href: '/dashboard/orders',
    title: 'Orders',
    eyebrow: 'Fulfilment',
  },
  {
    key: 'banners',
    name: 'Banners',
    href: '/dashboard/banners',
    title: 'Banners',
    eyebrow: 'Storefront',
  },
  {
    key: 'moment',
    name: 'The Moment',
    href: '/dashboard/moment',
    title: 'The Moment',
    eyebrow: 'Storefront',
  },
  {
    key: 'story',
    name: 'Story Page',
    href: '/dashboard/story',
    title: 'Story Page',
    eyebrow: 'Storefront',
  },
  {
    key: 'customers',
    name: 'Customers',
    href: '/dashboard/customers',
    title: 'Customers',
    eyebrow: 'The Register',
  },
  {
    key: 'newsletter',
    name: 'Newsletter',
    href: '/dashboard/newsletter',
    title: 'Newsletter',
    eyebrow: 'The Register',
  },
];

/** Resolve the nav entry for a pathname, longest (most specific) match first. */
export function navItemForPath(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );
}
