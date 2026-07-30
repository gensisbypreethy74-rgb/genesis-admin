'use client';

import { useId } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { Field, IconButton, ImagePicker, Input } from '@/components/ui';
import {
  MAX_IMAGES,
  SIZE_PRESETS,
  type IVariant,
  type VariantFieldErrors,
} from './types';

/**
 * The multi-variant editor: every variant is a bordered block on the cream
 * step, closed by a dashed "add" tile.
 *
 * Behaviour is carried over from the previous inline editor unchanged — the
 * volume/price/oldPrice/colour fields, the five-image cap per variant, the live
 * "actual < offer" price warning, and the split between already-saved `images`
 * and newly-picked `_files`. Only the presentation and the object-URL handling
 * (now ImagePicker's job) changed.
 *
 * Every mutation goes through a single `patch` call so two updates can never
 * race on a stale `variants` closure.
 */
export default function VariantEditor({
  variants,
  onChange,
  errors,
}: {
  variants: IVariant[];
  onChange: (next: IVariant[]) => void;
  /** Submit-time messages, keyed by variant index. */
  errors?: Record<number, VariantFieldErrors>;
}) {
  const uid = useId();

  const patch = (index: number, changes: Partial<IVariant>) => {
    const next = [...variants];
    next[index] = { ...next[index], ...changes };
    onChange(next);
  };

  // Size starts empty: '2' was a cosmetics-schema default (where `volume` meant
  // a bottle size) and would quietly save "2" as a garment size if untouched.
  const addVariant = () =>
    onChange([
      ...variants,
      { volume: '', price: 0, oldPrice: 0, color: '', images: [], _files: [] },
    ]);

  /**
   * Commit a removal, keeping the gallery alive.
   *
   * Only the first variant carries imagery, so deleting that row would take the
   * product's entire gallery with it — and the studio would have no picker on
   * the remaining rows to notice, let alone undo it. Hand the photos to
   * whichever row becomes first instead.
   */
  const applyRemoval = (next: IVariant[]) => {
    const first = variants[0];
    const lostFirst = next.length > 0 && !next.includes(first);
    onChange(
      lostFirst
        ? next.map((v, i) =>
            i === 0
              ? {
                  ...v,
                  images: [...(first.images || []), ...(v.images || [])],
                  _files: [...(first._files || []), ...(v._files || [])],
                }
              : v
          )
        : next
    );
  };

  const removeVariant = (index: number) =>
    applyRemoval(variants.filter((_, i) => i !== index));

  // ── Quick-add sizes ───────────────────────────────────────────────────────
  // Case-insensitive so "m" and "M" count as the same size.
  const norm = (s: string) => s.trim().toUpperCase();
  const hasSize = (size: string) => variants.some((v) => norm(v.volume) === norm(size));

  /**
   * Toggle a standard size on or off.
   *
   * Adding seeds price/oldPrice from the first already-priced variant, so the
   * common "one price, several sizes" flow is: price the first size, then tap
   * the rest. If the only variant is still the blank starter, its size is filled
   * in place rather than leaving an empty variant behind.
   */
  const toggleSize = (size: string) => {
    const label = norm(size);

    if (hasSize(label)) {
      if (variants.length === 1) {
        toast.error('A product needs at least one size.');
        return;
      }
      applyRemoval(variants.filter((v) => norm(v.volume) !== label));
      return;
    }

    const template = variants.find((v) => v.price > 0);
    const seeded = {
      volume: label,
      price: template?.price ?? 0,
      oldPrice: template?.oldPrice ?? 0,
      color: '',
      images: [] as string[],
      _files: [] as File[],
    };

    // Reuse the lone blank starter instead of adding a second empty block.
    if (variants.length === 1 && !variants[0].volume.trim()) {
      onChange([{ ...variants[0], volume: label }]);
      return;
    }
    onChange([...variants, seeded]);
  };

  /** Append a newly-picked upload, honouring the five-image cap. */
  const addFile = (index: number, file: File) => {
    const variant = variants[index];
    const count = (variant.images?.length || 0) + (variant._files?.length || 0);
    if (count + 1 > MAX_IMAGES) {
      toast.error('Each variant can have a maximum of 5 images.');
      return;
    }
    patch(index, { _files: [...(variant._files || []), file] });
  };

  const removeFile = (index: number, fileIdx: number) => {
    const files = [...(variants[index]._files || [])];
    files.splice(fileIdx, 1);
    patch(index, { _files: files });
  };

  const replaceFile = (index: number, fileIdx: number, file: File) => {
    const files = [...(variants[index]._files || [])];
    files.splice(fileIdx, 1, file);
    patch(index, { _files: files });
  };

  /** Drop an already-saved URL so it is left out of the next `variants` payload. */
  const removeExistingImage = (index: number, imgIdx: number) => {
    const images = [...(variants[index].images || [])];
    images.splice(imgIdx, 1);
    patch(index, { images });
  };

  /** Swap a saved URL for an upload — one patch, so neither half is lost. */
  const replaceExistingImage = (index: number, imgIdx: number, file: File) => {
    const variant = variants[index];
    const images = [...(variant.images || [])];
    images.splice(imgIdx, 1);
    patch(index, { images, _files: [...(variant._files || []), file] });
  };

  return (
    <div className="space-y-4">
      {/* Quick-add standard sizes. Each becomes a variant below, where its price
          and images can be tuned individually if they differ. */}
      <div>
        <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted mb-2">
          Sizes
        </p>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((size) => {
            const active = hasSize(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                aria-pressed={active}
                className={`min-w-[46px] px-3 py-2 border text-[12px] font-sans tracking-wide transition-colors duration-200 ease-editorial ${
                  active
                    ? 'bg-ink text-ivory border-ink'
                    : 'bg-ivory text-muted border-line hover:border-ink/40 hover:text-ink'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        <p className="font-sans text-[12px] text-faint mt-2">
          Tap to add a size, tap again to remove. Each size below can carry its
          own price and images; a non-standard size can be typed into any Size
          field.
        </p>
      </div>

      {variants.map((v, i) => {
        const fieldErrors = errors?.[i];
        const imageCount = (v.images?.length || 0) + (v._files?.length || 0);

        return (
          <div key={i} className="border border-line bg-cream p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow-tight text-bronze-deep">Variant {i + 1}</p>
              {variants.length > 1 && (
                <IconButton
                  label={`Remove variant ${i + 1}`}
                  tone="danger"
                  onClick={() => removeVariant(i)}
                >
                  <X size={14} />
                </IconButton>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/*
                Labelled "Size" but keyed `volume` — the cosmetics-era name the
                schema still carries, because carts and historical orders
                reference it. Only the label is the garment's.
              */}
              <Field
                label="Size"
                htmlFor={`${uid}-volume-${i}`}
                required
                error={fieldErrors?.volume}
              >
                <Input
                  id={`${uid}-volume-${i}`}
                  type="text"
                  placeholder="M"
                  value={v.volume}
                  error={!!fieldErrors?.volume}
                  onChange={(e) => patch(i, { volume: e.target.value })}
                />
              </Field>

              {/* Single price. `oldPrice` is zeroed on every edit so no
                  strikethrough MRP lingers from the old offer/actual split. */}
              <Field
                label="Price"
                htmlFor={`${uid}-price-${i}`}
                required
                error={fieldErrors?.price}
              >
                <Input
                  id={`${uid}-price-${i}`}
                  type="number"
                  placeholder="₹ Price"
                  value={v.price ? v.price : ''}
                  error={!!fieldErrors?.price}
                  onChange={(e) => patch(i, { price: Number(e.target.value), oldPrice: 0 })}
                />
              </Field>
            </div>

            {/* Imagery lives on the first variant only — every size shares one
                gallery, so photographing each size separately was duplicated
                work. Later variants carry size and price alone. */}
            {i === 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                  Product Images
                </span>
                <span className="font-sans text-[11px] text-faint tabular-nums">
                  {imageCount}/{MAX_IMAGES}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(v.images || []).map((url, imgIdx) => (
                  <ImagePicker
                    key={`saved-${imgIdx}-${url}`}
                    url={url}
                    ratio="aspect-square"
                    onSelect={(file) => replaceExistingImage(i, imgIdx, file)}
                    onClear={() => removeExistingImage(i, imgIdx)}
                  />
                ))}

                {(v._files || []).map((file, fileIdx) => (
                  <ImagePicker
                    key={`new-${fileIdx}-${file.name}-${file.lastModified}`}
                    file={file}
                    ratio="aspect-square"
                    onSelect={(next) => replaceFile(i, fileIdx, next)}
                    onClear={() => removeFile(i, fileIdx)}
                  />
                ))}

                {imageCount < MAX_IMAGES && (
                  <ImagePicker
                    ratio="aspect-square"
                    onSelect={(file) => addFile(i, file)}
                  />
                )}
              </div>

              <p className="font-sans text-[12px] text-faint mt-2">
                Shared by every size — upload once here.
              </p>
            </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addVariant}
        className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
      >
        <Plus size={14} aria-hidden />
        <span className="eyebrow-tight">Add variant</span>
      </button>
    </div>
  );
}
