# Genesis Studio — Admin Design System

The admin ("Studio") uses the storefront's editorial language, tuned for
administrative density. Everything below is enforced by tokens in
`src/app/globals.css` and primitives in `src/components/ui/`.

If you are adding a screen: **compose primitives, do not write raw markup.**
The panel previously had zero primitives and the same delete modal was pasted
four times. Don't restart that.

---

## 1. The rules

| Rule | Why |
|---|---|
| **No border radius.** Ever. | The storefront is square-cornered throughout. Radius is allowed *only* on genuine circles: avatars, spinners, the modal close button, toggle knobs. |
| **No shadows.** | Depth is expressed with the `line` hairline border and the cream-on-ivory surface step. The only shadow in the app is on toasts. |
| **No pure black, no cool grey, no bright colour.** | Text is `ink` (#1c1a15). Secondary is `muted` (#6f675a) — a warm olive-brown. Never `text-slate-*`, never `text-red-500`. |
| **One easing curve.** | `ease-editorial` = `cubic-bezier(0.16,1,0.3,1)`. Use the utility, not the literal. 200–300ms for interaction, longer only for imagery. |
| **Two typefaces, fixed roles.** | Cormorant (`font-display`), always `font-light`, for headings/titles/figures. Inter (`font-sans`) for everything functional. They never trade roles. |
| **Small sans text is uppercase + tracked.** | Use `.eyebrow` (11px/0.22em) or `.eyebrow-tight` (10px/0.15em). Never small lowercase sans labels. |

### Surfaces alternate

`ivory` page → `cream` card (lighter) → `ivory` control (recessed again).
Don't put a cream control on a cream card; it disappears.

---

## 2. Tokens

Colour (`bg-*`, `text-*`, `border-*`):

| Token | Hex | Use |
|---|---|---|
| `ivory` | `#f5f0e8` | page background, form controls |
| `cream` | `#faf6ef` | cards, panels |
| `beige` | `#e8dfd0` | hover fill |
| `tan` | `#f0e8d8` | warm band |
| `sand` | `#ece3d3` | placeholders, skeleton base |
| `ink` | `#1c1a15` | primary text, sidebar, primary button |
| `muted` | `#6f675a` | secondary text |
| `faint` | `#9a9284` | tertiary text, placeholders |
| `line` | `#ddd3c2` | every border |
| `bronze` | `#9c7a46` | accent, active markers |
| `bronze-deep` | `#83653a` | eyebrow text — the workhorse |
| `forest` | `#33432f` | green accent, primary-button hover |

Admin-only semantic tones (these do **not** exist in the storefront — it never
needed them, but a table of five order states does):

| Token | Hex | Use |
|---|---|---|
| `danger` / `danger-deep` / `danger-tint` | `#8f4034` / `#733227` / `#f6e9e5` | delete, cancelled, blocked, validation errors |
| `success` / `success-tint` | `#33432f` / `#e7ebe4` | delivered, active, paid |
| `warning` / `warning-tint` | `#83653a` / `#f2ead9` | processing, pending |
| `info` / `info-tint` | `#3f4a55` / `#e6e8ea` | shipped, in transit |

Any new tone must sit beside bronze and forest. If it looks like Tailwind's
default palette, it's wrong.

---

## 3. Primitives

Import from `@/components/ui`.

```tsx
import { Button, Card, CardHeader, PageHeader, Table, THead, TBody, Th, Tr, Td,
         Modal, ConfirmDialog, Field, Input, Textarea, Select, Checkbox, Toggle,
         StatusBadge, Spinner, Skeleton, SkeletonTable, SkeletonStat, EmptyState,
         SearchInput, Pagination, Reveal, Thumb, ImagePicker, IconButton } from '@/components/ui';
```

| Component | API |
|---|---|
| `Button` | `variant`: `solid` \| `outline` \| `danger` \| `ghost` · `size`: `sm` \| `md` · `loading` · `arrow` |
| `ButtonLink` | same, plus `href` |
| `Card` | `padded` (default true — set false when the child is a full-bleed `Table`) |
| `CardHeader` | `eyebrow`, `title`, `description`, `action` |
| `PageHeader` | `eyebrow`, `title`, `description`, `action` — every page opens with one |
| `Table` etc. | `Table > THead > Th`, `TBody > Tr > Td`. `Tr` takes `onClick`, `muted`. `Th`/`Td` take `align` |
| `Modal` | `open`, `onClose`, `eyebrow`, `title`, `footer`, `size`: `sm`\|`md`\|`lg`\|`xl`. Handles Esc, scroll lock, focus |
| `ConfirmDialog` | `open`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `loading`, `tone` |
| `Field` | wraps a control: `label`, `htmlFor`, `required`, `optional`, `error`, `hint` |
| `Input`/`Textarea`/`Select` | take `error?: boolean`; forwardRef'd |
| `StatusBadge` | `status` — tone is resolved centrally by `statusTone()`. **Never hand-colour a status.** |
| `Thumb` | image with branded placeholder fallback; resolves `/uploads/...` via `assetUrl` |
| `ImagePicker` | `file`, `url`, `onSelect`, `onClear` — preview, drag-drop, object-URL cleanup |
| `EmptyState` | `title`, `message`, `action`, `icon` |
| `Pagination` | `page` (1-indexed), `pageSize`, `total`, `onPageChange` |
| `Reveal` | mount fade+rise; `delay` to stagger |

---

## 4. Data + auth

**Always use the shared client. Never `axios` directly.**

```ts
import { api, assetUrl, apiErrorMessage } from '@/lib/api';

const res = await api.get('/products');          // baseURL already includes /v1
const url = assetUrl(product.images[0]);         // '/uploads/x.jpg' -> absolute
toast.error(apiErrorMessage(err, 'Could not save.'));
```

`api` attaches the `Bearer` token and handles 401/403 centrally (clear session →
toast → redirect to login). Pages must **not** re-implement auth headers or
auth-error handling — three divergent copies of that is what we just removed.

Formatting: `formatINR`, `formatDate`, `formatDateTime`, `shortId` from
`@/lib/format`.

---

## 5. Page anatomy

```tsx
<PageHeader eyebrow="The Edit" title="Pieces" description="…"
            action={<Button variant="solid" size="sm">Add Piece</Button>} />

<Card padded={false} className="p-5 sm:p-6">
  <div className="flex items-center justify-between gap-4 mb-5">
    <SearchInput value={q} onChange={setQ} placeholder="Search pieces…" />
  </div>

  {loading ? <SkeletonTable rows={6} cols={5} />
   : rows.length === 0 ? <EmptyState title="No pieces yet" … />
   : <Table>…</Table>}

  <Pagination page={page} pageSize={20} total={rows.length} onPageChange={setPage} />
</Card>
```

Every list screen owes the user: a loading skeleton (not a bare spinner), an
empty state, search, and pagination past ~20 rows.

Responsive: tables scroll horizontally inside their own container — the page
body must never scroll sideways. Drop non-essential columns with
`hidden md:table-cell` on **both** the `Th` and its `Td`.
