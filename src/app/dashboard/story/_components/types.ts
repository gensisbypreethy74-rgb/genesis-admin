// Shapes for the Story Management module, mirroring the backend StorySection /
// StorySettings models and the `GET /v1/story/admin` response.

export type StorySectionType =
  | 'hero'
  | 'founders-note'
  | 'text'
  | 'image'
  | 'gallery'
  | 'quote'
  | 'timeline'
  | 'cta';

export interface ITimelineItem {
  label: string;
  text: string;
}

export interface IStorySection {
  _id: string;
  type: StorySectionType;
  eyebrow?: string;
  title?: string;
  body?: string;
  tagline?: string;
  image?: string;
  images?: string[];
  imageAlt?: string;
  imageLeft?: boolean;
  quote?: string;
  quoteAuthor?: string;
  timeline?: ITimelineItem[];
  ctaLabel?: string;
  ctaHref?: string;
  order: number;
  status: 'DRAFT' | 'PUBLISHED';
}

export interface IStorySettings {
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  introEyebrow?: string;
  introHeading?: string;
  introDescription?: string;
}

/** The section kinds the admin can add, with studio-facing labels + guidance. */
export const SECTION_TYPES: { value: StorySectionType; label: string; hint: string }[] = [
  { value: 'text', label: 'Text + Image', hint: 'Editorial block: eyebrow, headline, copy, image, optional CTA.' },
  { value: 'founders-note', label: "Founder's Note", hint: 'Portrait beside a note — two columns.' },
  { value: 'hero', label: 'Hero / Intro', hint: 'Large opening headline with an image.' },
  { value: 'image', label: 'Full-width Image', hint: 'A single banner image with an optional caption.' },
  { value: 'gallery', label: 'Gallery', hint: 'A grid of images.' },
  { value: 'quote', label: 'Pull Quote', hint: 'A centred quote with attribution.' },
  { value: 'timeline', label: 'Timeline / Steps', hint: 'Numbered steps, e.g. “How a Moment Works”.' },
  { value: 'cta', label: 'CTA Banner', hint: 'A cream banner with a headline and a button.' },
];

export type FieldKey =
  | 'eyebrow'
  | 'title'
  | 'body'
  | 'tagline'
  | 'image'
  | 'imageAlt'
  | 'imageLeft'
  | 'gallery'
  | 'quote'
  | 'quoteAuthor'
  | 'timeline'
  | 'cta';

/** Which fields each section type exposes in the form. */
export const FIELDS_BY_TYPE: Record<StorySectionType, FieldKey[]> = {
  hero: ['eyebrow', 'title', 'body', 'image', 'imageAlt', 'imageLeft'],
  'founders-note': ['eyebrow', 'title', 'body', 'tagline', 'image', 'imageAlt', 'imageLeft'],
  text: ['eyebrow', 'title', 'body', 'tagline', 'image', 'imageAlt', 'imageLeft', 'cta'],
  image: ['title', 'body', 'image', 'imageAlt'],
  gallery: ['eyebrow', 'title', 'gallery'],
  quote: ['quote', 'quoteAuthor'],
  timeline: ['eyebrow', 'timeline'],
  cta: ['eyebrow', 'title', 'body', 'cta'],
};

export function sectionTypeLabel(type: StorySectionType): string {
  return SECTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** A short human summary of a section for the list row. */
export function sectionSummary(s: IStorySection): string {
  return s.title || s.eyebrow || s.quote || (s.timeline?.length ? `${s.timeline.length} steps` : '') || 'Untitled section';
}
