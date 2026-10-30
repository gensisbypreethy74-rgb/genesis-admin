'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal surface, matching the storefront's dialogs: ink scrim with a blur, an
 * ivory body ruled with `line`, an eyebrow-over-serif header, and a circular
 * close control (the one place radius is allowed).
 *
 * The admin previously inlined this markup six times. Beyond styling, this adds
 * the behaviour those copies were missing — see `useDialogBehaviour`.
 */

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

/** Open dialog panels, innermost last. Only the top one answers Escape / Tab. */
const openDialogs: HTMLElement[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Everything a modal surface owes keyboard and screen-reader users, shared by
 * Modal and the product drawer (which used to carry its own copy):
 *
 * - Escape calls `onClose` — only for the top-most dialog, so Escape on a
 *   confirm stacked over the drawer closes the confirm, not both.
 * - Tab / Shift+Tab wrap inside the panel.
 * - Every other child of <body> is `inert` while open, so the page behind can't
 *   be focused, clicked or read out. The panel must therefore live in a portal
 *   directly under <body>.
 * - Background scroll is locked (see `.modal-open` in globals.css).
 * - Focus moves into the panel on open and back to the trigger on close.
 */
export function useDialogBehaviour(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== panel) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0
      );
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!first) {
        e.preventDefault();
        panel.focus();
      } else if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, panelRef]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    let root: HTMLElement = panel;
    while (root.parentElement && root.parentElement !== document.body) root = root.parentElement;
    // Only touch what isn't inert already, so a stacked dialog hands back
    // exactly what it took and leaves the one beneath it in charge.
    const inerted = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== root && !el.inert
    );
    inerted.forEach((el) => (el.inert = true));

    openDialogs.push(panel);
    // Setting `body { overflow: hidden }` alone is a no-op inside the dashboard:
    // that shell is `h-dvh overflow-hidden` and the real scroller is <main>.
    // The class lets globals.css freeze whichever element is marked as the
    // scroll container.
    document.documentElement.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    // Wait a frame so the entering panel is laid out before it takes focus.
    const id = requestAnimationFrame(() => panel.focus());

    return () => {
      cancelAnimationFrame(id);
      openDialogs.splice(openDialogs.indexOf(panel), 1);
      inerted.forEach((el) => (el.inert = false));
      if (openDialogs.length === 0) {
        document.documentElement.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
      // Back to the trigger — or, if it has gone (e.g. the button the action
      // removed), to the dialog underneath so focus doesn't fall to <body>.
      if (restoreTo?.isConnected && !restoreTo.closest('[inert]')) restoreTo.focus();
      else openDialogs[openDialogs.length - 1]?.focus();
    };
  }, [open, panelRef]);
}

export default function Modal({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizes;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehaviour(open, panelRef, onClose);

  // Portaled to <body> so the background can be made inert around it.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`relative bg-ivory border border-line w-full ${sizes[size]} flex flex-col overflow-hidden max-h-[90vh] focus:outline-none`}
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-line shrink-0">
              <div className="min-w-0">
                {eyebrow && <p className="eyebrow text-bronze-deep mb-1">{eyebrow}</p>}
                <h2 className="font-display font-light text-2xl leading-tight text-ink">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-line text-muted hover:text-ink hover:border-ink/30 transition-colors duration-300 ease-editorial"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto thin-scrollbar">{children}</div>

            {footer && (
              <div className="p-5 sm:p-6 border-t border-line shrink-0 flex flex-wrap items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
