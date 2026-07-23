'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';
import {
  Button,
  Checkbox,
  Field,
  IconButton,
  ImagePicker,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { isUsableImageRef } from '@/components/ui/Thumb';
import VariantEditor from './VariantEditor';
import {
  CARE_ICONS,
  CARE_ICON_LABELS,
  EDIT_SECTIONS,
  LANDING_PAGE_LIMIT,
  LIFE_MODES,
  MAX_IMAGES,
  type CareIcon,
  type ICategory,
  type IProduct,
  type ISpec,
  type IVariant,
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
 * The product detail page fields are appended after `showOnLandingPage`. They're
 * all optional but are sent even when blank, because the backend updates with
 * `findByIdAndUpdate` — a key that isn't in the request is left alone, so
 * omitting an emptied field would make it impossible to ever clear one.
 * `specs` and `careIcons` are JSON-encoded because FormData flattens everything
 * to strings; the backend's `attachUploads` revives exactly `variants`, `specs`
 * and `careIcons`.
 */

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  imageUrls?: string;
  variants?: string;
  variantFields?: Record<number, VariantFieldErrors>;
}

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
  otherLandingCount,
  onClose,
  onSaved,
}: {
  /** null → creating a new piece. */
  product: IProduct | null;
  categories: ICategory[];
  /** Pieces already on the landing page, excluding the one being edited. */
  otherLandingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const activeCategories = categories.filter((c) => c.status === 'ACTIVE');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product ? product.category : '');
  // Default to the first active category, as before — but derived rather than
  // seeded, so the submitted value always matches what the select is showing
  // even if the categories arrived after the drawer was opened.
  const effectiveCategory = category || (activeCategories[0]?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [offerText, setOfferText] = useState(product?.offerText ?? '');
  const [keyFeatures, setKeyFeatures] = useState(product?.keyFeatures ?? '');
  const [garmentType, setGarmentType] = useState(product?.garmentType ?? '');
  const [collectionName, setCollectionName] = useState(product?.collectionName ?? '');
  const [editSection, setEditSection] = useState(product?.editSection ?? '');
  const [limited, setLimited] = useState(product?.limited ?? false);
  const [season, setSeason] = useState(product?.season ?? '');
  const [lifeMode, setLifeMode] = useState(product?.lifeMode ?? '');
  const [showOnLandingPage, setShowOnLandingPage] = useState(
    product?.showOnLandingPage ?? false
  );

  // ── Product detail page copy ────────────────────────────────────────────
  // Seeded from `product` in the initialiser like everything else here — the
  // drawer is mounted per-edit, so there is nothing to reset.
  const [tagline, setTagline] = useState(product?.tagline ?? '');
  const [fitNote, setFitNote] = useState(product?.fitNote ?? '');
  const [modelNote, setModelNote] = useState(product?.modelNote ?? '');
  const [studioNotes, setStudioNotes] = useState(product?.studioNotes ?? '');
  const [materialText, setMaterialText] = useState(product?.materialText ?? '');
  // Deep copy, as with variants: editing must not mutate the row behind us.
  // No seeded rows on a new piece — an empty table is a deliberate choice, and
  // pre-filled "Length / Shoulder" placeholders would get saved as-is.
  const [specs, setSpecs] = useState<ISpec[]>(() =>
    (product?.specs ?? []).map((s) => ({ label: s.label, value: s.value }))
  );
  const [fitFooter, setFitFooter] = useState(product?.fitFooter ?? '');
  // Filtering the saved list through CARE_ICONS drops anything the storefront
  // could not render anyway, and pins the order to the checklist's.
  const [careIcons, setCareIcons] = useState<CareIcon[]>(() => {
    const saved = product?.careIcons ?? [];
    return CARE_ICONS.filter((icon) => saved.includes(icon));
  });
  const [careText, setCareText] = useState(product?.careText ?? '');
  const [shippingReturns, setShippingReturns] = useState(product?.shippingReturns ?? '');
  // Existing images round-trip through this comma-separated field, exactly as
  // before: they are absolutised for display and re-posted as `images`.
  const [imageUrls, setImageUrls] = useState(() =>
    product ? product.images.map((url) => assetUrl(url)).join(', ') : ''
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<IVariant[]>(() =>
    product
      ? // Deep copy so editing never mutates the row in the list behind us.
        product.variants.map((v) => ({
          volume: v.volume,
          price: v.price,
          oldPrice: v.oldPrice,
          color: v.color || '',
          images: [...(v.images || [])],
          _files: [],
        }))
      : // Size starts empty, not '1'. That default is a leftover from the
        // cosmetics schema (where `volume` meant "100ml"); on a garment it
        // silently saved "1" as the size. Validation requires a size, so an
        // empty seed forces a real one rather than shipping a bogus default.
        [{ volume: '', price: 0, oldPrice: 0, color: '', images: [], _files: [] }]
  );

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock background scroll for as long as the drawer is mounted.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Move focus into the panel, and hand it back to the trigger on close.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  // ── Product-level imagery ───────────────────────────────────────────────
  // The URL list and the upload list are two halves of one gallery. The cap of
  // five applies to uploads only, as it always has.
  const urlList = imageUrls.split(',').map((url) => url.trim()).filter((url) => url);

  const setUrlList = (next: string[]) => setImageUrls(next.join(', '));

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
    setUrlList(urlList.filter((_, i) => i !== index));
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

    if (!name.trim() || !description.trim()) {
      if (!name.trim()) found.name = 'Required.';
      if (!description.trim()) found.description = 'Required.';
      fail('Name and description are required.');
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

    // The URL field is free text and its entries lead the gallery, so anything
    // unloadable typed here became the piece's thumbnail — that's how
    // "GOOGLE.COM" ended up as a product image. Reject what can't resolve.
    const badUrls = urlList.filter((url) => !isUsableImageRef(url));
    if (badUrls.length > 0) {
      found.imageUrls = `Not a usable image link: ${badUrls[0]}`;
      fail(
        `"${badUrls[0]}" is not an image link. Use a full https:// address, or upload the file instead.`
      );
    }

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
    formData.append('description', description);
    // Strip client-only fields (_files) from the variants JSON; keep existing image URLs
    const variantsPayload = variants.map((v) => ({
      volume: v.volume,
      price: v.price,
      oldPrice: v.oldPrice,
      color: v.color?.trim() || '',
      images: v.images || [],
    }));
    formData.append('variants', JSON.stringify(variantsPayload));

    // Attach each variant's newly uploaded files under variantImages_<index>
    variants.forEach((v, i) => {
      (v._files || []).forEach((file) => formData.append(`variantImages_${i}`, file));
    });
    formData.append('offerText', offerText);
    formData.append('keyFeatures', keyFeatures);
    formData.append('garmentType', garmentType);
    formData.append('collectionName', collectionName);
    formData.append('season', season);
    formData.append('lifeMode', lifeMode);
    formData.append('editSection', editSection);
    formData.append('limited', String(limited));
    formData.append('showOnLandingPage', String(showOnLandingPage));

    // ── Product detail page ────────────────────────────────────────────────
    // These are always sent, even when blank, exactly like `offerText` and
    // `garmentType` above. It's tempting to omit an empty one, but the backend
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

    // A half-typed row (label or value blank) is dropped: the schema requires
    // both, so posting one would fail the whole save. An empty array is still
    // sent, so removing every row actually removes the table.
    const specsPayload = specs
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label && s.value);
    formData.append('specs', JSON.stringify(specsPayload));

    formData.append('careIcons', JSON.stringify(careIcons));

    // Convert comma separated images to array
    const imagesArray = imageUrls.split(',').map((url) => url.trim()).filter((url) => url);
    imagesArray.forEach((url) => formData.append('images', url));

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
      toast.error(apiErrorMessage(err, 'Error connecting to backend'));
    } finally {
      setSaving(false);
    }
  };

  const landingLimitReached = otherLandingCount >= LANDING_PAGE_LIMIT && !showOnLandingPage;
  const title = product ? 'Edit Piece' : 'Add Piece';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClose}
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
            onClick={onClose}
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
                  {activeCategories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {activeCategories.length === 0 && (
                    <option value="">No Active Categories</option>
                  )}
                </Select>
              </Field>

              <Field
                label="Description"
                htmlFor={`${uid}-description`}
                required
                error={errors.description}
              >
                <Textarea
                  id={`${uid}-description`}
                  rows={5}
                  value={description}
                  error={!!errors.description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <Field
                label="Offer Text"
                htmlFor={`${uid}-offer-text`}
                optional
                hint="e.g. FLAT 35% OFF. Leave empty for default."
              >
                <Input
                  id={`${uid}-offer-text`}
                  type="text"
                  placeholder="Leave empty for default"
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                />
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
                  {urlList.map((url, index) => (
                    <ImagePicker
                      key={`url-${index}-${url}`}
                      url={url}
                      ratio="aspect-square"
                      onSelect={(file) => replaceUrlWithFile(index, file)}
                      onClear={() => setUrlList(urlList.filter((_, i) => i !== index))}
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
                  JPG, PNG or WEBP up to 5MB each.
                </p>
              </div>

              <Field
                label="Or provide Image URLs"
                htmlFor={`${uid}-image-urls`}
                optional
                error={errors.imageUrls}
                hint="Full https:// links, comma separated. Existing images appear above and are kept unless removed."
              >
                <Input
                  id={`${uid}-image-urls`}
                  type="text"
                  // Deliberately not a fake "https://image1.jpg" — the previous
                  // placeholder was typed in verbatim and saved as a product's
                  // image, which is exactly the trap this field sets.
                  placeholder="https://res.cloudinary.com/…/piece.jpg"
                  value={imageUrls}
                  error={!!errors.imageUrls}
                  onChange={(e) => setImageUrls(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Placement">
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

              <div className="border border-line bg-cream p-4">
                <Checkbox
                  label="Limited piece"
                  description="Shows a “LIMITED PIECE” tag on the product card."
                  checked={limited}
                  onChange={setLimited}
                />
              </div>

              <div
                className={`border border-line bg-cream p-4 ${
                  landingLimitReached ? 'opacity-60' : ''
                }`}
              >
                <Checkbox
                  label="Show on Landing Page"
                  description="Featured on the storefront home page. Five pieces maximum."
                  checked={showOnLandingPage}
                  disabled={landingLimitReached}
                  onChange={setShowOnLandingPage}
                />
                {landingLimitReached && (
                  <p className="font-sans text-[12px] text-danger mt-2 pl-7">
                    Maximum limit of 5 products reached.
                  </p>
                )}
              </div>
            </Section>
          </div>

          <div className="p-5 sm:p-6 border-t border-line shrink-0 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="sm" loading={saving}>
              {product ? 'Update Piece' : 'Create Piece'}
            </Button>
          </div>
        </form>
      </motion.aside>
    </div>
  );
}
