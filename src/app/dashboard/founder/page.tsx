'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Textarea, ImagePicker, Spinner } from '@/components/ui';
import { api, toastApiError } from '@/lib/api';

interface FounderNote {
  eyebrow: string; heading: string; body1: string; body2: string; signature: string; image: string;
}

export default function FounderPage() {
  const [n, setN] = useState<FounderNote | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/founder-note');
      if (res.data?.success) setN(res.data.data);
    } catch (e) {
      toastApiError(e, "Could not load the Founder's Note.");
      setError(true);
    }
  }, []);

  // Awaited in an async IIFE: the compiler's set-state-in-effect rule can't see
  // past a bare call to a named async function (same pattern as banners).
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const set = (k: keyof FounderNote, v: string) => setN((p) => (p ? { ...p, [k]: v } : p));

  // Type and size are checked once, in ImagePicker.
  const selectImage = (file: File) => {
    setImageFile(file);
    setN((p) => (p ? { ...p, image: '' } : p));
  };

  const save = async () => {
    if (!n) return;
    if (!n.heading.trim()) return toast.error('A heading is required.');
    if (!n.image && !imageFile) return toast.error('An image is required.');

    setSaving(true);
    const fd = new FormData();
    fd.append('eyebrow', n.eyebrow);
    fd.append('heading', n.heading);
    fd.append('body1', n.body1);
    fd.append('body2', n.body2);
    fd.append('signature', n.signature);
    if (imageFile) fd.append('image', imageFile);
    else fd.append('image', n.image);

    try {
      const res = await api.put('/founder-note', fd);
      if (res.data?.success) {
        setN(res.data.data);
        setImageFile(null);
        toast.success("Founder's Note updated");
      }
    } catch (e) {
      toastApiError(e, 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !n) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <p className="font-sans text-[13px] text-danger mb-4">Could not load the Founder&apos;s Note.</p>
        <Button variant="outline" size="sm" onClick={() => { setError(false); void load(); }}>Retry</Button>
      </div>
    );
  }

  if (!n) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Storefront"
        title="Founder's Note"
        description="The Founder's Note block on the homepage and the Story page — label, heading, both paragraphs, signature and portrait."
        action={<Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>}
      />

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <Card className="flex-1 min-w-0 w-full p-5 sm:p-6">
          <CardHeader eyebrow="Content" title="Text" />
          <div className="space-y-4 mt-4">
            <Field label="Section label" htmlFor="fn-eyebrow" hint="Small uppercase line above the heading.">
              <Input id="fn-eyebrow" value={n.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
            </Field>
            <Field label="Main heading" htmlFor="fn-heading" required>
              <Input id="fn-heading" value={n.heading} onChange={(e) => set('heading', e.target.value)} />
            </Field>
            <Field label="Description — paragraph 1" htmlFor="fn-body1">
              <Textarea id="fn-body1" rows={4} value={n.body1} onChange={(e) => set('body1', e.target.value)} />
            </Field>
            <Field label="Description — paragraph 2" htmlFor="fn-body2">
              <Textarea id="fn-body2" rows={4} value={n.body2} onChange={(e) => set('body2', e.target.value)} />
            </Field>
            <Field label="Founder signature" htmlFor="fn-signature" hint="e.g. — Preethy">
              <Input id="fn-signature" value={n.signature} onChange={(e) => set('signature', e.target.value)} />
            </Field>
          </div>
          <div className="mt-5">
            <Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>
          </div>
        </Card>

        <Card className="w-full xl:w-[380px] shrink-0 p-5 sm:p-6">
          <CardHeader eyebrow="Portrait" title="Image" />
          <div className="mt-4">
            <ImagePicker
              label="Founder's Note image"
              hint="Portrait, around 1000×1250. JPG, PNG or WEBP, max 15MB."
              ratio="aspect-[4/5]"
              file={imageFile}
              url={n.image}
              onSelect={selectImage}
              onClear={() => { setImageFile(null); set('image', ''); }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
