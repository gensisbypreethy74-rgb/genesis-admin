// Shapes returned by `GET /v1/products` and `GET /v1/categories`, plus the
// constants the product form enforces. Shared by page.tsx, ProductForm and
// VariantEditor so the three agree on one definition.

export interface IVariant {
  volume: string;
  price: number;
  oldPrice?: number;
  color?: string;
  /** Existing image URLs (from the server) — round-tripped in the `variants` JSON. */
  images?: string[];
  /** Newly selected uploads, posted as `variantImages_<index>` (client only). */
  _files?: File[];
  // NOTE: the previous `_previews: string[]` field is gone. It held object URLs
  // built by hand for <img src>, and was never revoked when the form was reset
  // or closed. ImagePicker owns the object-URL lifecycle now, so the field has
  // no reader. It was client-only and stripped before submit, so the request
  // body is unchanged.
}

/** One row of the storefront's Material & Fit table, e.g. { label: 'Shoulder', value: '15 in' }. */
export interface ISpec {
  label: string;
  value: string;
}

/**
 * Care symbols the product detail page can render. Mirrors `CARE_ICONS` in the
 * backend's Product model, which enums the field — a closed vocabulary, because
 * the storefront maps each key to an icon and an unrecognised key renders
 * nothing at all. Free text here would fail silently, so the form offers a
 * checklist. Keep this list in step with the schema's.
 */
export const CARE_ICONS = [
  'hand-wash',
  'machine-wash',
  'dont-bleach',
  'iron-low',
  'iron-medium',
  'dont-iron',
  'dry-in-shade',
  'dry-flat',
  'dont-tumble-dry',
  'dry-clean',
] as const;

export type CareIcon = (typeof CARE_ICONS)[number];

/** Studio-facing names for the care checklist. The key is what ships. */
export const CARE_ICON_LABELS: Record<CareIcon, string> = {
  'hand-wash': 'Hand Wash',
  'machine-wash': 'Machine Wash',
  'dont-bleach': "Don't Bleach",
  'iron-low': 'Iron Low',
  'iron-medium': 'Iron Medium',
  'dont-iron': "Don't Iron",
  'dry-in-shade': 'Dry in Shade',
  'dry-flat': 'Dry Flat',
  'dont-tumble-dry': "Don't Tumble Dry",
  'dry-clean': 'Dry Clean',
};

/**
 * One row of the per-product size chart. Measurements are CENTIMETRES only —
 * the storefront derives inches at render time, so the studio never enters or
 * maintains a second set of numbers.
 */
export interface ISizeChartRow {
  size: string;
  bust?: number;
  waist?: number;
  hip?: number;
  length?: number;
}

/** The size-chart measurement columns, in the order the table renders them. */
export const SIZE_CHART_FIELDS = [
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' },
  { key: 'length', label: 'Length' },
] as const;

export type SizeChartField = (typeof SIZE_CHART_FIELDS)[number]['key'];

export interface IProduct {
  _id: string;
  name: string;
  category: string;
  description?: string;
  variants: IVariant[];
  offerText?: string;
  keyFeatures?: string;
  images: string[];
  status: string;
  showOnLandingPage?: boolean;
  garmentType?: string;
  collectionName?: string;
  season?: string;
  lifeMode?: string;
  editSection?: string;
  limited?: boolean;
  materials?: string[];

  // ── Product detail page ──────────────────────────────────────────────────
  // All optional: the storefront omits a section rather than render an empty
  // heading, so a half-described piece still reads as finished.
  tagline?: string;
  fitNote?: string;
  modelNote?: string;
  studioNotes?: string;
  materialText?: string;
  specs?: ISpec[];
  sizeChart?: ISizeChartRow[];
  fitFooter?: string;
  careIcons?: CareIcon[];
  careText?: string;
  shippingReturns?: string;
}

export interface ICategory {
  _id: string;
  name: string;
  status: string;
}

/** Life modes drive the storefront's "Four Life Modes" section and ?mode= filtering. */
export const LIFE_MODES = ['Ambition', 'Occasion', 'Casual/Out', 'At-Home Identity'];

/** THE EDIT sub-pages a piece can be placed on (empty = not on any Edit page). */
export const EDIT_SECTIONS = ['Within', 'Beyond', 'Genesis Men', 'Archive'];

/**
 * The Moment — a fixed category offered alongside EDIT_SECTIONS, so it is always
 * selectable whether or not the studio has created a matching entry under
 * Categories. Filing a piece here publishes it to The Moment's product surfaces
 * on its own; no second step on the Moment page. Mirrored by `MOMENT_CATEGORY`
 * in the storefront's lib/product.ts — the string is the contract between them.
 */
export const MOMENT_CATEGORY = 'The Moment';

/**
 * The standard apparel size ladder, in wearing order, offered as quick-add chips
 * in the variant editor. A size the studio picks becomes a variant whose
 * `volume` is this label — the storefront renders one selectable button per
 * variant. Non-standard sizes (e.g. "Free Size", "38") are still typeable in the
 * variant's Size field.
 */
export const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

/** Uploads allowed per product, and per variant. */
export const MAX_IMAGES = 5;

/** Per-variant validation messages, keyed by variant index in `ProductForm`. */
export interface VariantFieldErrors {
  volume?: string;
  price?: string;
  oldPrice?: string;
}
