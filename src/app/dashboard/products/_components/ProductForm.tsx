'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, X, Trash2 } from 'lucide-react';
import { api, toastApiError } from '@/lib/api';
import { useDialogBehaviour } from '@/components/ui/Modal';
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Field,
  IconButton,
  ImagePicker,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import VariantEditor from './VariantEditor';
import {
  CARE_ICONS,
  CARE_ICON_LABELS,
  EDIT_SECTIONS,
  MOMENT_CATEGORY,
  LIFE_MODES,
  MAX_IMAGES,
  SIZE_CHART_FIELDS,
  DEFAULT_SPECS,
  DEFAULT_SIZE_ROWS,
  DEFAULT_SIZE_CHART_GROUPS,
  DEFAULT_DELIVERY_NOTE,
  type CareIcon,
  type ICategory,
  type IProduct,
  type ISizeChartRow,
  type ISizeChartGroup,
  type ISpec,
  type IVariant,
  type SizeChartField,
  type VariantFieldErrors,
} from './types';

/**
 * The add/edit drawer.
 *
 * Mounted only while open (the parent's AnimatePresence owns the exit), so all
 * form state seeds straight from `product` in useState initialisers — no reset
 * effects, and no chance of a background refetch overwriting what is being
 * typed.
 *
 * The request keeps the shape it has always had — same endpoints, same method,
 * same FormData field names in the same order, same `variants` JSON. The shared
 * `api` client attaches auth and handles 401/403, and axios sets the multipart
 * boundary.
 *
 * The product detail page fields are appended after `editSection`. They're
 * all optional but are sent even when blank, because the backend updates with
 * `findByIdAndUpdate` — a key that isn't in the request is left alone, so
 * omitting an emptied field would make it impossible to ever clear one.
 * The structured fields are JSON-encoded because FormData flattens everything
 * to strings; the backend's `attachUploads` revives exactly `variants`,
 * `specs`, `careIcons`, `sizeChart`, `sizeCharts` and `materials`. Booleans go
 * as 'true' / 'false', which Mongoose casts.
 */

/** Product `status` values the backend knows. Archived hides a piece from the shop. */
const PRODUCT_STATUSES = [
  { value: 'In Stock', label: 'In Stock — shown in the shop' },
  { value: 'Archived', label: 'Archived — hidden from the shop' },
];

interface FormErrors {
  name?: string;
  category?: string;
  variants?: string;
  variantFields?: Record<number, VariantFieldErrors>;
}

/**
 * A size-chart row while it is being edited: every cell a string, because a
 * controlled number input the user is halfway through typing into is a string.
 */
type SizeChartDraft = Record<'size' | SizeChartField, string>;

const EMPTY_SIZE_ROW: SizeChartDraft = {
  size: '',
  bust: '',
  waist: '',
  hip: '',
  inseam: '',
  length: '',
};

const toDraft = (row: ISizeChartRow): SizeChartDraft => ({
  size: row.size ?? '',
  bust: row.bust?.toString() ?? '',
  waist: row.waist?.toString() ?? '',
  hip: row.hip?.toString() ?? '',
  inseam: row.inseam?.toString() ?? '',
  length: row.length?.toString() ?? '',
});

/** key → label lookup for a chart's chosen columns. */
const FIELD_LABEL = Object.fromEntries(SIZE_CHART_FIELDS.map((f) => [f.key, f.label])) as Record<
  SizeChartField,
  string
>;
const ALL_FIELD_KEYS = SIZE_CHART_FIELDS.map((f) => f.key);

/** A named size chart while it's being edited — carries its own columns. */
type SizeChartGroupDraft = { title: string; fields: SizeChartField[]; rows: SizeChartDraft[] };
const toGroupDraft = (g: ISizeChartGroup): SizeChartGroupDraft => ({
  title: g.title,
  // Legacy charts had no `fields` — fall back to the full column set.
  fields: g.fields?.length ? g.fields : [...ALL_FIELD_KEYS],
  rows: g.rows.map(toDraft),
});

/**
 * Drafts → the payload rows, dropping anything the storefront could not draw:
 * a row with no size label has no leftmost cell to sit under, and a row with a
 * label but not one usable measurement is an empty line in the table. Blank and
 * non-numeric cells are omitted rather than coerced — `Number('')` is 0, which
 * would publish a 0 cm bust.
 */
const toSizeChartPayload = (drafts: SizeChartDraft[]): ISizeChartRow[] =>
  drafts.reduce<ISizeChartRow[]>((rows, draft) => {
    const size = draft.size.trim();
    if (!size) return rows;

    const row: ISizeChartRow = { size };
    for (const { key } of SIZE_CHART_FIELDS) {
      const raw = draft[key].trim();
      if (!raw) continue;
      const cm = Number(raw);
      if (Number.isFinite(cm) && cm > 0) row[key] = cm;
    }

    return SIZE_CHART_FIELDS.some(({ key }) => row[key] !== undefined)
      ? [...rows, row]
      : rows;
  }, []);

/**
 * "Cotton, Linen , cotton" → ['Cotton', 'Linen'].
 *
 * Deduped case-insensitively but stored with the studio's own casing, so
 * "100% Cotton" survives intact instead of being title-cased into nonsense.
 * The storefront's Material filter groups by a slug of these, so a stray
 * "cotton" on another piece still lands in the same filter option.
 */
const toMaterialsPayload = (raw: string): string[] => {
  const seen = new Set<string>();
  return raw.split(',').reduce<string[]>((out, part) => {
    const label = part.trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return out;
    seen.add(key);
    return [...out, label];
  }, []);
};

/** Hairline-ruled group with an eyebrow label. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <p className="eyebrow text-bronze-deep mb-4">{label}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  /** null → creating a new piece. */
  product: IProduct | null;
  categories: ICategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const reduce = useReducedMotion();
  // False while the parent's AnimatePresence plays the exit, so focus, inert
  // and scroll lock are handed back as soon as the drawer starts closing.
  const isPresent = useIsPresent();
  const panelRef = useRef<HTMLElement>(null);

  const activeCategories = categories.filter((c) => c.status === 'ACTIVE');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product ? product.category : '');
  // Default to the first active category, as before — but derived rather than
  // seeded, so the submitted value always matches what the select is showing
  // even if the categories arrived after the drawer was opened.
  const effectiveCategory = category || activeCategories[0]?.name || EDIT_SECTIONS[0];
  // The fixed options (the four Edit pages, then The Moment), then every active
  // studio category. The piece's own category is appended when it isn't in any
  // of those — a category that was deactivated, renamed or deleted after the
  // piece was filed would otherwise leave the Select with no matching <option>,
  // so it would display the first one and silently refile the piece on save.
  const categoryOptions = [
    ...new Set([
      ...EDIT_SECTIONS,
      MOMENT_CATEGORY,
      ...activeCategories.map((c) => c.name),
      effectiveCategory,
    ]),
  ];
  const [keyFeatures, setKeyFeatures] = useState(product?.keyFeatures ?? '');
  const [garmentType, setGarmentType] = useState(product?.garmentType ?? '');
  const [collectionName, setCollectionName] = useState(product?.collectionName ?? '');
  const [editSection, setEditSection] = useState(product?.editSection ?? '');
  // Held as the raw comma-separated string so a trailing comma mid-typing is
  // just text; it splits into the array once, on submit.
  const [materials, setMaterials] = useState((product?.materials ?? []).join(', '));
  const [lifeMode, setLifeMode] = useState(product?.lifeMode ?? '');
  const [season, setSeason] = useState(product?.season ?? '');
  // Only the two contract values; anything else was never hidden from the
  // shop, so it seeds as In Stock.
  const [status, setStatus] = useState(product?.status === 'Archived' ? 'Archived' : 'In Stock');
  const [limited, setLimited] = useState(product?.limited ?? false);
  const [showOnLandingPage, setShowOnLandingPage] = useState(product?.showOnLandingPage ?? false);
  const [offerText, setOfferText] = useState(product?.offerText ?? '');

  // ── Product detail page copy ────────────────────────────────────────────
  // Seeded from `product` in the initialiser like everything else here — the
  // drawer is mounted per-edit, so there is nothing to reset.
  const [tagline, setTagline] = useState(product?.tagline ?? '');
  const [fitNote, setFitNote] = useState(product?.fitNote ?? '');
  const [modelNote, setModelNote] = useState(product?.modelNote ?? '');
  const [studioNotes, setStudioNotes] = useState(product?.studioNotes ?? '');
  const [materialText, setMaterialText] = useState(product?.materialText ?? '');
  // Deep copy, as with variants: editing must not mutate the row behind us.
  // A NEW piece ships with the default spec table (measurement labels, blank
  // values) so every product has one out of the box; editing keeps whatever was
  // saved. All rows are editable / removable below.
  const [specs, setSpecs] = useState<ISpec[]>(() =>
    product
      ? (product.specs ?? []).map((s) => ({ label: s.label, value: s.value }))
      : DEFAULT_SPECS.map((s) => ({ label: s.label, value: s.value }))
  );
  // Size chart rows are held as strings, not numbers, so a half-typed cell
  // ("9", mid-way to "94") stays exactly what was typed instead of being
  // round-tripped through Number() on every keystroke. They convert once, on
  // submit. Values are centimetres — the storefront derives inches.
  // Multiple named size charts. New pieces seed the two defaults; an older
  // piece with a single legacy `sizeChart` is wrapped as one titled chart.
  const [sizeCharts, setSizeCharts] = useState<SizeChartGroupDraft[]>(() => {
    if (!product) return DEFAULT_SIZE_CHART_GROUPS.map(toGroupDraft);
    if (product.sizeCharts?.length) return product.sizeCharts.map(toGroupDraft);
    if (product.sizeChart?.length)
      return [{ title: 'Size Chart', fields: [...ALL_FIELD_KEYS], rows: product.sizeChart.map(toDraft) }];
    // A piece saved before size charts existed still shows the defaults, so the
    // section is present and editable by default — like the spec table.
    return DEFAULT_SIZE_CHART_GROUPS.map(toGroupDraft);
  });
  const [fitFooter, setFitFooter] = useState(product?.fitFooter ?? '');
  // Filtering the saved list through CARE_ICONS drops anything the storefront
  // could not render anyway, and pins the order to the checklist's.
  const [careIcons, setCareIcons] = useState<CareIcon[]>(() => {
    const saved = product?.careIcons ?? [];
    return CARE_ICONS.filter((icon) => saved.includes(icon));
  });
  const [careText, setCareText] = useState(product?.careText ?? '');
  const [shippingReturns, setShippingReturns] = useState(
    product ? (product.shippingReturns ?? '') : DEFAULT_DELIVERY_NOTE
  );
  // The piece's stored images, exactly as stored (Cloudinary URLs or
  // `/uploads/...` paths), re-posted verbatim as `images` so they survive a
  // save — the backend $sets whatever `images` it receives. ImagePicker applies
  // `assetUrl` for display only. (They used to round-trip as absolutised URLs in
  // a comma-joined string, which wrote this admin's backend origin into the
  // database and split any URL containing a comma.)
  const [storedImages, setStoredImages] = useState<string[]>(() => [...(product?.images ?? [])]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<IVariant[]>(() => {
    if (!product) {
      // Size starts empty, not '1'. That default is a leftover from the
      // cosmetics schema (where `volume` meant "100ml"); on a garment it
      // silently saved "1" as the size. Validation requires a size, so an
      // empty seed forces a real one rather than shipping a bogus default.
      return [{ volume: '', price: 0, oldPrice: 0, color: '', images: [], _files: [] }];
    }

    // Deep copy so editing never mutates the row in the list behind us.
    const rows = product.variants.map((v) => ({
      volume: v.volume,
      price: v.price,
      oldPrice: v.oldPrice,
      color: v.color || '',
      images: [...(v.images || [])],
      // null / missing = not tracked.
      stock: v.stock ?? undefined,
      _files: [] as File[],
    }));

    // Only the first variant carries imagery now. A product saved under the old
    // per-variant model may have photos spread across sizes, and those sizes no
    // longer render a picker — so fold them onto the first row rather than
    // stranding them somewhere invisible and unremovable. Deduped by URL, since
    // the same photo was often uploaded to every size. Nothing is dropped: the
    // storefront pools the whole set into one gallery either way.
    const [first, ...rest] = rows;
    if (first) {
      const seen = new Set(first.images);
      for (const row of rest) {
        for (const url of row.images) {
          if (seen.has(url)) continue;
          seen.add(url);
          first.images.push(url);
        }
        row.images = [];
      }
    }

    return rows;
  });

  // ── Closing ─────────────────────────────────────────────────────────────
  // Everything the form would save, as one string, captured on mount — so
  // Escape, a backdrop click or Cancel can tell whether closing loses work.
  const snapshot = () =>
    JSON.stringify([
      name, category, keyFeatures, garmentType, collectionName, editSection, materials,
      lifeMode, season, status, limited, showOnLandingPage, offerText, tagline, fitNote,
      modelNote, studioNotes, materialText, specs, sizeCharts, fitFooter, careIcons, careText,
      shippingReturns, storedImages, imageFiles.length,
      variants.map((v) => [v.volume, v.price, v.oldPrice, v.stock, v.images, v._files?.length]),
    ]);
  const [initialSnapshot] = useState(snapshot);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (saving) return;
    if (snapshot() !== initialSnapshot) setConfirmDiscard(true);
    else onClose();
  };

  // Escape, focus trap, inert background, scroll lock and focus restore — the
  // same behaviour as Modal, from the same hook.
  useDialogBehaviour(isPresent, panelRef, requestClose);

  // ── Product-level imagery ───────────────────────────────────────────────
  // Stored images render as tiles, can be cleared or swapped for an upload,
  // and are re-posted as `images` on submit.
  // The cap of five applies to uploads only, as it always has.
  const addImageFile = (file: File) => {
    if (imageFiles.length + 1 > MAX_IMAGES) {
      toast.error('You can upload a maximum of 5 images.');
      return;
    }
    setImageFiles((prev) => [...prev, file]);
  };

  const replaceImageFile = (index: number, file: File) =>
    setImageFiles((prev) => prev.map((f, i) => (i === index ? file : f)));

  const removeImageFile = (index: number) =>
    setImageFiles((prev) => prev.filter((_, i) => i !== index));

  const replaceUrlWithFile = (index: number, file: File) => {
    if (imageFiles.length + 1 > MAX_IMAGES) {
      toast.error('You can upload a maximum of 5 images.');
      return;
    }
    setStoredImages((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => [...prev, file]);
  };

  // ── Material & Fit spec rows ────────────────────────────────────────────
  // Mirrors VariantEditor: every mutation is one call on the previous state,
  // so two edits can never race on a stale closure.
  const patchSpec = (index: number, changes: Partial<ISpec>) =>
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, ...changes } : s)));

  const addSpec = () => setSpecs((prev) => [...prev, { label: '', value: '' }]);

  const removeSpec = (index: number) =>
    setSpecs((prev) => prev.filter((_, i) => i !== index));

  // ── Size chart rows (centimetres) ───────────────────────────────────────
  const patchChartTitle = (gi: number, title: string) =>
    setSizeCharts((prev) => prev.map((g, i) => (i === gi ? { ...g, title } : g)));
  const patchSizeRow = (gi: number, ri: number, changes: Partial<SizeChartDraft>) =>
    setSizeCharts((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, rows: g.rows.map((r, j) => (j === ri ? { ...r, ...changes } : r)) } : g
      )
    );
  const addSizeRow = (gi: number) =>
    setSizeCharts((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, rows: [...g.rows, { ...EMPTY_SIZE_ROW }] } : g))
    );
  const removeSizeRow = (gi: number, ri: number) =>
    setSizeCharts((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, rows: g.rows.filter((_, j) => j !== ri) } : g))
    );
  const addSizeChart = () =>
    setSizeCharts((prev) => [
      ...prev,
      { title: 'New Size Chart', fields: ['bust', 'waist', 'hip', 'length'], rows: DEFAULT_SIZE_ROWS.map(toDraft) },
    ]);
  const removeSizeChart = (gi: number) =>
    setSizeCharts((prev) => prev.filter((_, i) => i !== gi));

  /** Toggle one care symbol, keeping the stored order equal to CARE_ICONS'. */
  const toggleCareIcon = (icon: CareIcon, checked: boolean) =>
    setCareIcons((prev) =>
      checked
        ? CARE_ICONS.filter((key) => key === icon || prev.includes(key))
        : prev.filter((key) => key !== icon)
    );

  // ── Validation ──────────────────────────────────────────────────────────
  // Same rules in the same order as before; only the `volume` message follows
  // that field's rename to "Size". The first failure is what gets toasted;
  // every failure is also surfaced on its Field. The product detail page fields
  // are all optional and go unvalidated — a blank one is simply not sent.
  const validate = (): { errors: FormErrors; message: string | null } => {
    const found: FormErrors = { variantFields: {} };
    let message: string | null = null;
    const fail = (m: string) => {
      if (!message) message = m;
    };

    if (!name.trim()) {
      found.name = 'Required.';
      fail('Name is required.');
    }
    if (!effectiveCategory) {
      found.category = 'Required.';
      fail('Category is required.');
    }
    if (variants.length === 0) {
      found.variants = 'At least one variant is required.';
      fail('At least one variant is required.');
    }

    variants.forEach((v, i) => {
      const vf: VariantFieldErrors = {};
      // Same rule as before; only the noun follows the field's new "Size"
      // label. The `volume` key it validates is untouched.
      if (!v.volume.trim()) {
        vf.volume = 'Size is required.';
        fail(`Variant ${i + 1}: Size is required.`);
      }
      if (v.price <= 0) {
        vf.price = 'Must be greater than zero.';
        fail(`Variant ${i + 1}: Offer Price must be greater than zero.`);
      }
      if (v.oldPrice && v.oldPrice > 0 && v.oldPrice < v.price) {
        vf.oldPrice = 'Actual Price cannot be less than Offer Price';
        fail(
          `Variant ${i + 1}: Actual Price (₹${v.oldPrice}) cannot be less than Offer Price (₹${v.price}).`
        );
      }
      if (Object.keys(vf).length > 0) found.variantFields![i] = vf;
    });

    // The bad-URL check that used to live here guarded the free-text URL field,
    // which is gone: nothing can type a link in any more, so `storedImages` only ever
    // holds the piece's own stored images. Keeping the check would block saving
    // a legacy record carrying an unloadable URL — with no field left to correct
    // it in, and no visible error, since the message rendered on that field.
    // A bad stored image now shows as a broken tile the studio can clear.

    return { errors: found, message };
  };

  const handleSubmit = async () => {
    const { errors: found, message } = validate();
    setErrors(found);
    if (message) {
      toast.error(message);
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', effectiveCategory);
    // Strip client-only fields (_files) from the variants JSON; keep existing image URLs
    const variantsPayload = variants.map((v) => ({
      volume: v.volume,
      price: v.price,
      oldPrice: v.oldPrice,
      // No colour field in the editor any more — this carries whatever a variant
      // already had straight back. Don't "clean it up": `variants` is $set as a
      // whole array, so dropping the key here erases the stored colour of every
      // variant on the next save.
      color: v.color?.trim() || '',
      images: v.images || [],
      // Only when typed: undefined drops out of the JSON, meaning "not tracked".
      stock: v.stock,
    }));
    formData.append('variants', JSON.stringify(variantsPayload));

    // Attach each variant's newly uploaded files under variantImages_<index>
    variants.forEach((v, i) => {
      (v._files || []).forEach((file) => formData.append(`variantImages_${i}`, file));
    });
    formData.append('keyFeatures', keyFeatures);
    formData.append('garmentType', garmentType);
    formData.append('collectionName', collectionName);
    formData.append('season', season);
    formData.append('lifeMode', lifeMode);
    formData.append('editSection', editSection);
    // Always sent, so clearing the field actually clears the storefront filter.
    formData.append('materials', JSON.stringify(toMaterialsPayload(materials)));

    // ── Product detail page ────────────────────────────────────────────────
    // These are always sent, even when blank, exactly like `garmentType`
    // above. It's tempting to omit an empty one, but the backend
    // updates via `findByIdAndUpdate`, which only $sets the keys it receives —
    // so an omitted field can never be cleared. Emptying a tagline in the studio
    // would silently come back on the next load. Sending '' clears it, and the
    // storefront omits a section whose field is falsy either way.
    const appendTrimmed = (key: string, value: string) =>
      formData.append(key, value.trim());

    appendTrimmed('tagline', tagline);
    appendTrimmed('fitNote', fitNote);
    appendTrimmed('modelNote', modelNote);
    appendTrimmed('studioNotes', studioNotes);
    appendTrimmed('materialText', materialText);
    appendTrimmed('fitFooter', fitFooter);
    appendTrimmed('careText', careText);
    appendTrimmed('shippingReturns', shippingReturns);

    formData.append('status', status);
    formData.append('limited', String(limited));
    formData.append('showOnLandingPage', String(showOnLandingPage));
    appendTrimmed('offerText', offerText);

    // A half-typed row (label or value blank) is dropped: the schema requires
    // both, so posting one would fail the whole save. An empty array is still
    // sent, so removing every row actually removes the table.
    const specsPayload = specs
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label && s.value);
    formData.append('specs', JSON.stringify(specsPayload));

    // Same contract as `specs`: unusable rows dropped, empty array still sent so
    // clearing the chart clears it on the storefront too.
    const sizeChartsPayload = sizeCharts
      .map((g) => ({ title: g.title.trim(), fields: g.fields, rows: toSizeChartPayload(g.rows) }))
      .filter((g) => g.title && g.rows.length);
    formData.append('sizeCharts', JSON.stringify(sizeChartsPayload));
    // Migrate off the legacy single chart so it can't shadow the named ones.
    formData.append('sizeChart', JSON.stringify([]));

    formData.append('careIcons', JSON.stringify(careIcons));

    // Raw stored values. None left → no field → the backend saves an empty set.
    storedImages.forEach((url) => formData.append('images', url));

    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        formData.append('imageFiles', file);
      });
    }
    // No stray stock-photo fallback: a product saved without any image is stored
    // with an empty image set, and the storefront renders its editorial
    // placeholder. Product/variant images uploaded here (Cloudinary URLs) are what
    // the frontend gallery and cards display.

    try {
      // axios sets the multipart boundary from the FormData itself — hand-setting
      // Content-Type here would omit it.
      const res = product
        ? await api.put(`/products/${product._id}`, formData)
        : await api.post('/products', formData);

      const data = res.data;
      if (data.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully');
        onSaved();
      } else {
        toast.error(data.message || 'Failed to save product');
      }
    } catch (err) {
      toastApiError(err, 'Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const title = product ? 'Edit Piece' : 'Add Piece';

  // Portaled to <body> so this full-viewport drawer is never nested in — and so
  // never adds scroll height to, or is clipped by — whichever page embeds the
  // pieces manager (the Moment page renders it deep inside the scrolling <main>).
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={requestClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />

      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { x: '100%' }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: '100%' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-ivory border-l border-line w-full max-w-[560px] h-full flex flex-col focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-line shrink-0">
          <div className="min-w-0">
            <p className="eyebrow text-bronze-deep mb-1">
              {product ? 'The Edit' : 'New Piece'}
            </p>
            <h2 className="font-display font-light text-2xl leading-tight text-ink truncate">
              {product ? product.name || title : title}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close drawer"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-line text-muted hover:text-ink hover:border-ink/30 transition-colors duration-300 ease-editorial"
          >
            <X size={16} />
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto thin-scrollbar p-5 sm:p-6 space-y-6">
            <Section label="Details">
              <Field label="Name" htmlFor={`${uid}-name`} required error={errors.name}>
                <Input
                  id={`${uid}-name`}
                  type="text"
                  value={name}
                  error={!!errors.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              <Field
                label="Category"
                htmlFor={`${uid}-category`}
                required
                error={errors.category}
              >
                <Select
                  id={`${uid}-category`}
                  value={effectiveCategory}
                  error={!!errors.category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Key Features"
                htmlFor={`${uid}-key-features`}
                optional
                hint="Benefits — one per line, or comma separated."
              >
                <Textarea
                  id={`${uid}-key-features`}
                  rows={4}
                  placeholder={'e.g. Breathes in humidity\nHolds its line after a wash'}
                  value={keyFeatures}
                  onChange={(e) => setKeyFeatures(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="The Piece">
              <Field
                label="Tagline"
                htmlFor={`${uid}-tagline`}
                optional
                hint="Italic line under the price."
              >
                <Textarea
                  id={`${uid}-tagline`}
                  rows={2}
                  placeholder="e.g. The piece she reaches for when the house is finally hers again."
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </Field>

              <Field
                label="Fit Note"
                htmlFor={`${uid}-fit-note`}
                optional
                hint="One line beside the fit, above the size buttons."
              >
                <Input
                  id={`${uid}-fit-note`}
                  type="text"
                  placeholder="e.g. Relaxed through the body. True to size."
                  value={fitNote}
                  onChange={(e) => setFitNote(e.target.value)}
                />
              </Field>

              <Field
                label="Studio Notes"
                htmlFor={`${uid}-studio-notes`}
                optional
                hint="The paragraph under the STUDIO NOTES heading."
              >
                <Textarea
                  id={`${uid}-studio-notes`}
                  rows={4}
                  placeholder="Why the piece exists, and who it was cut for."
                  value={studioNotes}
                  onChange={(e) => setStudioNotes(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Variants">
              {errors.variants && (
                <p className="font-sans text-[12px] text-danger">{errors.variants}</p>
              )}
              <VariantEditor
                variants={variants}
                onChange={setVariants}
                errors={errors.variantFields}
              />

              <Field
                label="Model Note"
                htmlFor={`${uid}-model-note`}
                optional
                hint="Shown under the size buttons, e.g. 'Model is 168cm and wears size M.'"
              >
                <Input
                  id={`${uid}-model-note`}
                  type="text"
                  placeholder="e.g. Model is 168cm and wears size M."
                  value={modelNote}
                  onChange={(e) => setModelNote(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Measurements">
              <Field
                label="Material"
                htmlFor={`${uid}-material-text`}
                optional
                hint="Opening line of MATERIAL & FIT."
              >
                <Textarea
                  id={`${uid}-material-text`}
                  rows={3}
                  placeholder="e.g. 100% cotton mul body with cotton chikan lace trim."
                  value={materialText}
                  onChange={(e) => setMaterialText(e.target.value)}
                />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Spec Table
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {specs.length} {specs.length === 1 ? 'row' : 'rows'}
                  </span>
                </div>

                <div className="space-y-3">
                  {specs.map((s, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end"
                    >
                      <Field label="Label" htmlFor={`${uid}-spec-label-${i}`}>
                        <Input
                          id={`${uid}-spec-label-${i}`}
                          type="text"
                          placeholder="e.g. Shoulder"
                          value={s.label}
                          onChange={(e) => patchSpec(i, { label: e.target.value })}
                        />
                      </Field>

                      <Field label="Value" htmlFor={`${uid}-spec-value-${i}`}>
                        <Input
                          id={`${uid}-spec-value-${i}`}
                          type="text"
                          placeholder="e.g. 15 in"
                          value={s.value}
                          onChange={(e) => patchSpec(i, { value: e.target.value })}
                        />
                      </Field>

                      <IconButton
                        label={`Remove spec row ${i + 1}`}
                        tone="danger"
                        onClick={() => removeSpec(i)}
                        className="mb-1"
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addSpec}
                    className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
                  >
                    <Plus size={14} aria-hidden />
                    <span className="eyebrow-tight">Add row</span>
                  </button>
                </div>

                <p className="font-sans text-[12px] text-faint mt-2">
                  Length, Shoulder, Sleeve, Fabric — a row is skipped unless both
                  halves are filled in.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Size Charts — centimetres
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {sizeCharts.length} {sizeCharts.length === 1 ? 'chart' : 'charts'}
                  </span>
                </div>

                <div className="space-y-5">
                  {sizeCharts.map((group, gi) => (
                    <div key={gi} className="border border-line bg-cream p-4 space-y-3">
                      {/* Editable heading + remove-chart */}
                      <div className="flex items-end gap-3">
                        <Field
                          label="Size chart heading"
                          htmlFor={`${uid}-chart-title-${gi}`}
                          className="flex-1"
                        >
                          <Input
                            id={`${uid}-chart-title-${gi}`}
                            type="text"
                            placeholder="e.g. Top & Dresses"
                            value={group.title}
                            onChange={(e) => patchChartTitle(gi, e.target.value)}
                          />
                        </Field>
                        {sizeCharts.length > 1 && (
                          <IconButton
                            label={`Remove ${group.title || 'chart'}`}
                            tone="danger"
                            onClick={() => removeSizeChart(gi)}
                            className="mb-1"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                      </div>

                      {group.rows.map((row, ri) => (
                        <div key={ri} className="flex flex-wrap items-end gap-3">
                          <Field
                            label="Size"
                            htmlFor={`${uid}-size-${gi}-${ri}`}
                            className="flex-1 min-w-[72px]"
                          >
                            <Input
                              id={`${uid}-size-${gi}-${ri}`}
                              type="text"
                              placeholder="e.g. M"
                              value={row.size}
                              onChange={(e) => patchSizeRow(gi, ri, { size: e.target.value })}
                            />
                          </Field>

                          {group.fields.map((key) => (
                            <Field
                              key={key}
                              label={FIELD_LABEL[key]}
                              htmlFor={`${uid}-size-${gi}-${key}-${ri}`}
                              className="flex-1 min-w-[72px]"
                            >
                              <Input
                                id={`${uid}-size-${gi}-${key}-${ri}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                placeholder="cm"
                                value={row[key]}
                                onChange={(e) => patchSizeRow(gi, ri, { [key]: e.target.value })}
                              />
                            </Field>
                          ))}

                          <IconButton
                            label={`Remove size row ${ri + 1}`}
                            tone="danger"
                            onClick={() => removeSizeRow(gi, ri)}
                            className="mb-1 shrink-0"
                          >
                            <X size={14} />
                          </IconButton>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addSizeRow(gi)}
                        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
                      >
                        <Plus size={14} aria-hidden />
                        <span className="eyebrow-tight">Add size</span>
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addSizeChart}
                    className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
                  >
                    <Plus size={14} aria-hidden />
                    <span className="eyebrow-tight">Add size chart</span>
                  </button>
                </div>

                <p className="font-sans text-[12px] text-faint mt-2">
                  Enter centimetres only — the storefront converts to inches on its
                  own (1 in = 2.54 cm) and offers shoppers a unit toggle. Leave a
                  measurement blank to drop that column; a row needs a size label
                  and at least one measurement to be saved.
                </p>
              </div>

              <Field
                label="Fit Footer"
                htmlFor={`${uid}-fit-footer`}
                optional
                hint="Closing line under the spec table."
              >
                <Input
                  id={`${uid}-fit-footer`}
                  type="text"
                  placeholder="e.g. Unlined. Non-stretch. Side-seam pockets."
                  value={fitFooter}
                  onChange={(e) => setFitFooter(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Care">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Care Symbols
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {careIcons.length} selected
                  </span>
                </div>

                <div
                  role="group"
                  aria-label="Care symbols"
                  className="border border-line bg-cream p-4 grid grid-cols-2 gap-3"
                >
                  {CARE_ICONS.map((icon) => (
                    <Checkbox
                      key={icon}
                      label={CARE_ICON_LABELS[icon]}
                      checked={careIcons.includes(icon)}
                      onChange={(checked) => toggleCareIcon(icon, checked)}
                    />
                  ))}
                </div>

                <p className="font-sans text-[12px] text-faint mt-2">
                  Each ticked symbol renders as an icon above the care copy.
                </p>
              </div>

              <Field
                label="Care Text"
                htmlFor={`${uid}-care-text`}
                optional
                hint="The paragraph under the CARE heading."
              >
                <Textarea
                  id={`${uid}-care-text`}
                  rows={3}
                  placeholder="e.g. Gentle hand wash in cold water. Dry in shade."
                  value={careText}
                  onChange={(e) => setCareText(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Delivery">
              <Field
                label="Shipping & Returns"
                htmlFor={`${uid}-shipping-returns`}
                optional
                hint="Leave empty to use the site-wide shipping and returns copy."
              >
                <Textarea
                  id={`${uid}-shipping-returns`}
                  rows={3}
                  placeholder="Only if this piece departs from the site default."
                  value={shippingReturns}
                  onChange={(e) => setShippingReturns(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Imagery">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Uploads
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {imageFiles.length}/{MAX_IMAGES} selected
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {storedImages.map((url, index) => (
                    <ImagePicker
                      key={`url-${index}-${url}`}
                      url={url}
                      ratio="aspect-square"
                      onSelect={(file) => replaceUrlWithFile(index, file)}
                      onClear={() => setStoredImages((prev) => prev.filter((_, i) => i !== index))}
                    />
                  ))}

                  {imageFiles.map((file, index) => (
                    <ImagePicker
                      key={`file-${index}-${file.name}-${file.lastModified}`}
                      file={file}
                      ratio="aspect-square"
                      onSelect={(next) => replaceImageFile(index, next)}
                      onClear={() => removeImageFile(index)}
                    />
                  ))}

                  {imageFiles.length < MAX_IMAGES && (
                    <ImagePicker ratio="aspect-square" onSelect={addImageFile} />
                  )}
                </div>

                <p className="font-sans text-[12px] text-faint mt-2">
                  JPG, PNG or WEBP up to 15MB each.
                </p>
              </div>

            </Section>

            <Section label="Placement">
              <Field
                label="Status"
                htmlFor={`${uid}-status`}
                hint="Archived pieces stay in order history and old links, but can't be bought."
              >
                <Select
                  id={`${uid}-status`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {PRODUCT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Offer Text"
                htmlFor={`${uid}-offer-text`}
                optional
                hint="A short tag on the product card."
              >
                <Input
                  id={`${uid}-offer-text`}
                  type="text"
                  placeholder="e.g. Festive Offer"
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                />
              </Field>

              <div className="space-y-3">
                <Checkbox
                  label="Limited piece"
                  description="Adds the LIMITED PIECE tag to the product card."
                  checked={limited}
                  onChange={setLimited}
                />
                <Checkbox
                  label="Show on homepage"
                  description="Includes this piece in the homepage product showcase."
                  checked={showOnLandingPage}
                  onChange={setShowOnLandingPage}
                />
              </div>

              <Field
                label="Garment Type"
                htmlFor={`${uid}-garment-type`}
                optional
                hint="Shown under the name on the storefront."
              >
                <Input
                  id={`${uid}-garment-type`}
                  type="text"
                  placeholder="e.g. Lace-Trim Kurta Set"
                  value={garmentType}
                  onChange={(e) => setGarmentType(e.target.value)}
                />
              </Field>

              <Field
                label="Life Mode"
                htmlFor={`${uid}-life-mode`}
                optional
                hint="Drives the Four Life Modes section."
              >
                <Select
                  id={`${uid}-life-mode`}
                  value={lifeMode}
                  onChange={(e) => setLifeMode(e.target.value)}
                >
                  <option value="">— None —</option>
                  {LIFE_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="The Edit Page"
                htmlFor={`${uid}-edit-section`}
                optional
                hint="Places this piece on a THE EDIT sub-page."
              >
                <Select
                  id={`${uid}-edit-section`}
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                >
                  <option value="">— None —</option>
                  {EDIT_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Collection" htmlFor={`${uid}-collection`} optional>
                  <Input
                    id={`${uid}-collection`}
                    type="text"
                    placeholder="e.g. Onam"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                  />
                </Field>
                <Field label="Season" htmlFor={`${uid}-season`} optional>
                  <Input
                    id={`${uid}-season`}
                    type="text"
                    placeholder="e.g. Onam 2026"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="Materials"
                htmlFor={`${uid}-materials`}
                optional
                hint="Comma separated, e.g. Cotton, Linen. Drives the Material filter on the shop — options are built from what's entered here, so a new fabric needs no code change."
              >
                <Input
                  id={`${uid}-materials`}
                  type="text"
                  placeholder="e.g. Cotton, Linen"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                />
              </Field>

            </Section>
          </div>

          <div className="p-5 sm:p-6 border-t border-line shrink-0 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={requestClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="sm" loading={saving}>
              {product ? 'Update Piece' : 'Create Piece'}
            </Button>
          </div>
        </form>
      </motion.aside>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        eyebrow="Unsaved changes"
        title="Discard your changes?"
        message="This piece has edits that haven't been saved. Closing now will lose them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
      />
    </div>,
    document.body
  );
}
