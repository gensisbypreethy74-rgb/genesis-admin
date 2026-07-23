'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import {
  Card,
  CardHeader,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Button,
  ImagePicker,
  IconButton,
} from '@/components/ui';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';
import {
  IStorySection,
  StorySectionType,
  ITimelineItem,
  SECTION_TYPES,
  FIELDS_BY_TYPE,
  FieldKey,
} from './types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface Props {
  section: IStorySection | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function SectionForm({ section, onSaved, onClose }: Props) {
  const editing = !!section;

  const [type, setType] = useState<StorySectionType>(section?.type ?? 'text');
  const [eyebrow, setEyebrow] = useState(section?.eyebrow ?? '');
  const [title, setTitle] = useState(section?.title ?? '');
  const [body, setBody] = useState(section?.body ?? '');
  const [tagline, setTagline] = useState(section?.tagline ?? '');
  const [imageAlt, setImageAlt] = useState(section?.imageAlt ?? '');
  const [imageLeft, setImageLeft] = useState(section?.imageLeft ?? false);
  const [quote, setQuote] = useState(section?.quote ?? '');
  const [quoteAuthor, setQuoteAuthor] = useState(section?.quoteAuthor ?? '');
  const [ctaLabel, setCtaLabel] = useState(section?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(section?.ctaHref ?? '');
  const [published, setPublished] = useState(section?.status === 'PUBLISHED');

  const [image, setImage] = useState(section?.image ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [galleryUrls, setGalleryUrls] = useState<string[]>(section?.images ?? []);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const [timeline, setTimeline] = useState<ITimelineItem[]>(
    section?.timeline?.length ? section.timeline : []
  );

  const [saving, setSaving] = useState(false);

  const fields = FIELDS_BY_TYPE[type];
  const has = (f: FieldKey) => fields.includes(f);

  // Object URL for the single-image live preview when a new file is picked.
  const filePreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ''),
    [imageFile]
  );
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const selectImage = (file: File) => {
    if (file.size > MAX_FILE_SIZE) return toast.error('Image must be under 5MB');
    setImageFile(file);
    setImage('');
  };

  const addGalleryFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) return toast.error('Image must be under 5MB');
    setGalleryFiles((prev) => [...prev, file]);
  };

  const addTimelineRow = () => setTimeline((prev) => [...prev, { label: '', text: '' }]);
  const updateTimeline = (i: number, key: keyof ITimelineItem, value: string) =>
    setTimeline((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  const removeTimeline = (i: number) =>
    setTimeline((prev) => prev.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    const t = SECTION_TYPES.find((s) => s.value === type)?.label ?? type;
    if (type === 'quote' && !quote.trim()) return 'A quote is required.';
    if (type === 'timeline' && timeline.filter((x) => x.label || x.text).length === 0)
      return 'Add at least one step.';
    if (type === 'gallery' && galleryUrls.length + galleryFiles.length === 0)
      return 'Add at least one image to the gallery.';
    if (['hero', 'founders-note', 'text', 'cta'].includes(type) && !title.trim() && !eyebrow.trim())
      return `A headline or label is required for a ${t} section.`;
    if (has('cta') && ctaLabel.trim() && !ctaHref.trim())
      return 'A CTA button needs a link.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setSaving(true);
    const fd = new FormData();
    fd.append('type', type);
    fd.append('status', published ? 'PUBLISHED' : 'DRAFT');

    if (has('eyebrow')) fd.append('eyebrow', eyebrow);
    if (has('title')) fd.append('title', title);
    if (has('body')) fd.append('body', body);
    if (has('tagline')) fd.append('tagline', tagline);
    if (has('imageAlt')) fd.append('imageAlt', imageAlt);
    if (has('imageLeft')) fd.append('imageLeft', String(imageLeft));
    if (has('quote')) fd.append('quote', quote);
    if (has('quoteAuthor')) fd.append('quoteAuthor', quoteAuthor);
    if (has('cta')) {
      fd.append('ctaLabel', ctaLabel);
      fd.append('ctaHref', ctaHref);
    }
    if (has('image')) {
      if (imageFile) fd.append('image', imageFile);
      else fd.append('image', image); // '' clears it, a URL keeps it
    }
    if (has('gallery')) {
      fd.append('images', JSON.stringify(galleryUrls));
      galleryFiles.forEach((f) => fd.append('galleryImages', f));
    }
    if (has('timeline')) {
      fd.append('timeline', JSON.stringify(timeline.filter((x) => x.label || x.text)));
    }

    try {
      const res = editing
        ? await api.put(`/story/sections/${section!._id}`, fd)
        : await api.post('/story/sections', fd);
      if (res.data?.success) {
        toast.success(editing ? 'Section updated' : 'Section created');
        onSaved();
      } else {
        toast.error(res.data?.message || 'Could not save section');
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save section'));
    } finally {
      setSaving(false);
    }
  };

  const previewImage = filePreview || assetUrl(image);

  return (
    <Card
      padded={false}
      className="w-full xl:w-[440px] shrink-0 xl:sticky xl:top-0 flex flex-col xl:max-h-[calc(100vh-9rem)]"
    >
      <div className="p-5 sm:p-6 border-b border-line shrink-0">
        <CardHeader
          eyebrow={editing ? 'Editing' : 'Create'}
          title={editing ? 'Edit Section' : 'New Section'}
          action={
            <IconButton label="Close panel" onClick={onClose}>
              <X size={14} />
            </IconButton>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar p-5 sm:p-6 space-y-5">
        {/* Live preview */}
        <div className="border border-line bg-cream">
          <div className="px-3 py-2 border-b border-line">
            <span className="text-[10px] uppercase tracking-[0.16em] text-faint">Live preview</span>
          </div>
          <SectionPreview
            data={{ type, eyebrow, title, body, tagline, quote, quoteAuthor, ctaLabel, imageLeft, timeline }}
            previewImage={previewImage}
            galleryCount={galleryUrls.length + galleryFiles.length}
          />
        </div>

        <Field label="Section type" htmlFor="section-type" hint={SECTION_TYPES.find((t) => t.value === type)?.hint}>
          <Select id="section-type" value={type} onChange={(e) => setType(e.target.value as StorySectionType)}>
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        {has('eyebrow') && (
          <Field label="Eyebrow / Label" htmlFor="f-eyebrow" hint="Small uppercase label above the headline.">
            <Input id="f-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Within" />
          </Field>
        )}

        {has('title') && (
          <Field label="Headline" htmlFor="f-title">
            <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="At-Home Identity, without an audience." />
          </Field>
        )}

        {has('body') && (
          <Field label="Body" htmlFor="f-body" hint="Blank line = new paragraph. Use **bold** and *italic*.">
            <Textarea id="f-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Clothes for the hours that belong only to you…" />
          </Field>
        )}

        {has('tagline') && (
          <Field label="Italic tagline" htmlFor="f-tagline">
            <Input id="f-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Some clothes ask you to perform. This one asks you to sit down." />
          </Field>
        )}

        {has('quote') && (
          <Field label="Quote" htmlFor="f-quote" required>
            <Textarea id="f-quote" rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="I did not want clothing that performs…" />
          </Field>
        )}
        {has('quoteAuthor') && (
          <Field label="Attribution" htmlFor="f-quote-author">
            <Input id="f-quote-author" value={quoteAuthor} onChange={(e) => setQuoteAuthor(e.target.value)} placeholder="Preethy · Founder" />
          </Field>
        )}

        {has('image') && (
          <ImagePicker
            label="Image"
            hint="Around 1200×1500 for portraits. Max 5MB."
            ratio="aspect-[4/5]"
            file={imageFile}
            url={image}
            onSelect={selectImage}
            onClear={() => {
              setImageFile(null);
              setImage('');
            }}
          />
        )}

        {has('imageAlt') && (
          <Field label="Image alt text" htmlFor="f-alt" hint="Describes the image for screen readers and SEO.">
            <Input id="f-alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="A woman in a red kaftan in a teal-walled interior" />
          </Field>
        )}

        {has('imageLeft') && (
          <div className="border-t border-line pt-5">
            <Checkbox
              label="Image on the left"
              description="Otherwise the image sits to the right of the text (desktop)."
              checked={imageLeft}
              onChange={setImageLeft}
            />
          </div>
        )}

        {has('gallery') && (
          <div className="space-y-3">
            <span className="block text-[13px] font-medium text-ink">Gallery images</span>
            <div className="grid grid-cols-3 gap-2">
              {galleryUrls.map((url, i) => (
                <GalleryThumb key={`u-${i}`} src={assetUrl(url)} onRemove={() => setGalleryUrls((p) => p.filter((_, idx) => idx !== i))} />
              ))}
              {galleryFiles.map((f, i) => (
                <GalleryThumb key={`f-${i}`} src={URL.createObjectURL(f)} onRemove={() => setGalleryFiles((p) => p.filter((_, idx) => idx !== i))} isNew />
              ))}
            </div>
            <ImagePicker label="Add image" hint="Max 5MB each." ratio="aspect-[4/5]" file={null} url="" onSelect={addGalleryFile} />
          </div>
        )}

        {has('timeline') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">Steps</span>
              <button onClick={addTimelineRow} className="inline-flex items-center gap-1 text-[12px] text-bronze-deep hover:text-ink">
                <Plus size={13} /> Add step
              </button>
            </div>
            {timeline.length === 0 && <p className="text-[12px] text-faint">No steps yet.</p>}
            {timeline.map((it, i) => (
              <div key={i} className="flex items-start gap-2 border border-line p-3">
                <GripVertical size={14} className="text-faint mt-2 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Input value={it.label} onChange={(e) => updateTimeline(i, 'label', e.target.value)} placeholder="01" />
                  <Textarea rows={2} value={it.text} onChange={(e) => updateTimeline(i, 'text', e.target.value)} placeholder="A small, named run…" />
                </div>
                <IconButton label="Remove step" tone="danger" onClick={() => removeTimeline(i)}>
                  <Trash2 size={13} />
                </IconButton>
              </div>
            ))}
          </div>
        )}

        {has('cta') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Button label" htmlFor="f-cta-label">
              <Input id="f-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Shop Within" />
            </Field>
            <Field label="Button link" htmlFor="f-cta-href">
              <Input id="f-cta-href" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/the-edit/within" />
            </Field>
          </div>
        )}

        <div className="border-t border-line pt-5">
          <Checkbox
            label="Published"
            description="Published sections appear on the storefront Story page immediately."
            checked={published}
            onChange={setPublished}
          />
        </div>

        <Button variant="solid" onClick={handleSubmit} loading={saving} className="w-full">
          {editing ? 'Save changes' : 'Create section'}
        </Button>
      </div>
    </Card>
  );
}

function GalleryThumb({ src, onRemove, isNew }: { src: string; onRemove: () => void; isNew?: boolean }) {
  return (
    <div className="relative aspect-[4/5] bg-sand overflow-hidden group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      {isNew && <span className="absolute top-1 left-1 text-[9px] uppercase tracking-wide bg-ink/80 text-ivory px-1">New</span>}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-ink/80 text-ivory p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove image"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────────
interface PreviewData {
  type: StorySectionType;
  eyebrow: string;
  title: string;
  body: string;
  tagline: string;
  quote: string;
  quoteAuthor: string;
  ctaLabel: string;
  imageLeft: boolean;
  timeline: ITimelineItem[];
}

function SectionPreview({
  data,
  previewImage,
  galleryCount,
}: {
  data: PreviewData;
  previewImage: string;
  galleryCount: number;
}) {
  const { type } = data;
  const firstPara = (data.body || '').split(/\n{2,}/)[0];

  const ImageBox = ({ ratio = 'aspect-[4/5]' }: { ratio?: string }) =>
    previewImage ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={previewImage} alt="" className={`w-full ${ratio} object-cover`} />
    ) : (
      <div className={`w-full ${ratio} bg-sand flex items-center justify-center text-[10px] uppercase tracking-widest text-faint`}>
        Image
      </div>
    );

  if (type === 'quote') {
    return (
      <div className="p-6 text-center bg-tan">
        <p className="font-serif italic text-[17px] leading-snug text-ink">{data.quote ? `“${data.quote}”` : 'Your quote…'}</p>
        {data.quoteAuthor && <p className="text-[10px] uppercase tracking-[0.16em] text-bronze-deep mt-3">{data.quoteAuthor}</p>}
      </div>
    );
  }

  if (type === 'cta') {
    return (
      <div className="p-5 bg-tan flex items-center justify-between gap-3">
        <div>
          {data.eyebrow && <p className="text-[9px] uppercase tracking-[0.16em] text-faint mb-1">{data.eyebrow}</p>}
          <p className="font-serif text-[15px] text-ink leading-snug">{data.title || 'Headline…'}</p>
        </div>
        {data.ctaLabel && <span className="shrink-0 bg-ink text-ivory text-[9px] uppercase tracking-[0.14em] px-3 py-2">{data.ctaLabel}</span>}
      </div>
    );
  }

  if (type === 'timeline') {
    return (
      <div className="p-5">
        {data.eyebrow && <p className="text-[9px] uppercase tracking-[0.16em] text-faint text-center mb-4">{data.eyebrow}</p>}
        <div className="grid grid-cols-3 gap-2 text-center">
          {(data.timeline.length ? data.timeline : [{ label: '01', text: 'Step' }]).slice(0, 3).map((it, i) => (
            <div key={i}>
              <span className="font-serif text-[20px] text-bronze block">{it.label || '—'}</span>
              <p className="text-[10px] text-muted leading-tight mt-1">{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'gallery') {
    return (
      <div className="p-5">
        {data.title && <p className="font-serif text-[15px] text-ink mb-3">{data.title}</p>}
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: Math.max(galleryCount, 3) }).slice(0, 6).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-sand" />
          ))}
        </div>
        <p className="text-[10px] text-faint mt-2">{galleryCount} image{galleryCount === 1 ? '' : 's'}</p>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="p-5">
        <ImageBox ratio="aspect-[16/9]" />
        {data.title && <p className="font-serif text-[15px] text-ink mt-3">{data.title}</p>}
        {firstPara && <p className="text-[11px] text-muted mt-1 line-clamp-2">{firstPara}</p>}
      </div>
    );
  }

  // two-column (text / hero / founders-note)
  const textCol = (
    <div className="flex-1">
      {data.eyebrow && <p className="text-[9px] uppercase tracking-[0.16em] text-bronze-deep mb-1.5">{data.eyebrow}</p>}
      <p className="font-serif text-[15px] leading-snug text-ink">{data.title || 'Headline…'}</p>
      {firstPara && <p className="text-[11px] text-muted leading-relaxed mt-2 line-clamp-3">{firstPara}</p>}
      {data.tagline && <p className="font-serif italic text-[11px] text-muted mt-2">{data.tagline}</p>}
      {data.ctaLabel && <p className="text-[9px] uppercase tracking-[0.14em] text-ink border-b border-ink inline-block pb-0.5 mt-3">{data.ctaLabel}</p>}
    </div>
  );
  const imageCol = (
    <div className="w-[38%] shrink-0">
      <ImageBox />
    </div>
  );

  return (
    <div className="p-5 flex items-center gap-4">
      {data.imageLeft ? (
        <>
          {imageCol}
          {textCol}
        </>
      ) : (
        <>
          {textCol}
          {imageCol}
        </>
      )}
    </div>
  );
}
