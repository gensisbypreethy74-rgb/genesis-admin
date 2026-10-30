import axios from 'axios';
import { toast } from 'react-hot-toast';
import { clearAdminSession, ADMIN_TOKEN_KEY } from '@/lib/adminSession';

// Single API client for the whole admin.
//
// This replaces three separately-spelled copies of the same helper
// (`getAuthHeaders`, `authHeaders`, and inline localStorage reads) plus the
// inconsistent 401 handling that had some pages redirecting to login and others
// silently console.error-ing. Endpoints, payloads and auth semantics are
// unchanged — this only centralizes how requests are built and how auth
// failures are surfaced.

/**
 * Server origin, e.g. http://localhost:5000. NEXT_PUBLIC_BACKEND_URL may be
 * given with or without a trailing "/api" or "/api/v1" (and trailing slashes);
 * all forms resolve to the same origin. Uploaded images are served from the
 * origin root (`/uploads/...`), not from under `/api`. There is deliberately no
 * default: `next.config.ts` refuses to start or build without a valid value.
 */
const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!RAW_BACKEND_URL) throw new Error('NEXT_PUBLIC_BACKEND_URL is not set.');

const ASSET_ORIGIN = RAW_BACKEND_URL
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api(\/v1)?$/, '');

export const api = axios.create({
  baseURL: `${ASSET_ORIGIN}/api/v1`,
});

// Attach the admin JWT. localStorage stays the source of truth for API auth;
// the `adminToken=1` cookie exists only so proxy.ts can gate routes.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// One consistent auth-failure path for every call in the app.
//
// Latched, because pages fire several requests concurrently: without this, a
// page with three in-flight calls would stack three identical "session expired"
// toasts and kick off three redirects when the token lapses.
let handlingAuthFailure = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && typeof window !== 'undefined') {
      if (!handlingAuthFailure) {
        handlingAuthFailure = true;
        clearAdminSession();
        // Stable id so react-hot-toast dedupes rather than stacking.
        toast.error('Your session has expired. Please sign in again.', {
          id: 'admin-session-expired',
        });
        window.location.href = '/admin-login';
      }
      // Let callers skip their own error toast — the redirect is already the
      // user-visible outcome, and "could not load orders" on top of "session
      // expired" just adds noise.
      (error as { isAuthFailure?: boolean }).isAuthFailure = true;
    }
    return Promise.reject(error);
  }
);

/** True when the shared client already handled this error (session expiry). */
export function isAuthFailure(error: unknown): boolean {
  return Boolean((error as { isAuthFailure?: boolean })?.isAuthFailure);
}

/**
 * Resolve an image reference from the API to a displayable URL.
 * Server-relative paths (`/uploads/x.jpg`) get the backend origin prefixed;
 * absolute URLs (Cloudinary etc.) pass through untouched.
 */
export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${ASSET_ORIGIN}${path}`;
  return path;
}

/**
 * Report a failed request to the user. Prefer this over
 * `toast.error(apiErrorMessage(...))`: on session expiry the interceptor has
 * already toasted and redirected, so this stays quiet instead of stacking a
 * second, less useful message on top.
 */
export function toastApiError(error: unknown, fallback: string): void {
  if (isAuthFailure(error)) return;
  toast.error(apiErrorMessage(error, fallback));
}

/**
 * Pull a human-readable message out of an axios error, falling back to a
 * caller-supplied default. Pages were each doing this by hand.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    // No response at all: the API was unreachable (on Render's free plan, usually
    // waking up or restarting after a deploy). axios only says "Network Error".
    if (!error.response && error.code !== 'ERR_CANCELED') {
      return "Can't reach the server. It may be starting up. Please try again in a minute.";
    }
    return (
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      fallback
    );
  }
  return fallback;
}
