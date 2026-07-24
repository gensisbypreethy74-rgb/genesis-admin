'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Spinner } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';

interface CategorySection {
  eyebrow: string; heading: string; shopLabel: string; shopHref: string;
}

export default function CategorySectionPage() {
  const [s, setS] = useState<CategorySection | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/category-section');
      if (res.data?.success) {
        const d = res.data.data;
        setS({ eyebrow: d.eyebrow ?? '', heading: d.heading ?? '', shopLabel: d.shopLabel ?? '', shopHref: d.shopHref ?? '' });
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load the category section.'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof CategorySection, v: string) => setS((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!s) return;
    if (!s.heading.trim()) return toast.error('A heading is required.');
    setSaving(true);
    try {
      const res = await api.put('/category-section', s);
      if (res.data?.success) { toast.success('Category section updated'); }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  if (!s) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Storefront"
        title="Category Section"
        description='The homepage "The Edit" category grid — its label, heading and "Shop All" button.'
        action={<Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>}
      />
      <Card className="p-5 sm:p-6 max-w-2xl">
        <CardHeader eyebrow="Content" title="Section content" />
        <div className="space-y-4 mt-4">
          <Field label="Section label" htmlFor="cat-eyebrow" hint="Small uppercase line above the heading.">
            <Input id="cat-eyebrow" value={s.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} placeholder="The Edit" />
          </Field>
          <Field label="Section heading" htmlFor="cat-heading" required>
            <Input id="cat-heading" value={s.heading} onChange={(e) => set('heading', e.target.value)} placeholder="Find your way in." />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Shop All button text" htmlFor="cat-shop-label">
              <Input id="cat-shop-label" value={s.shopLabel} onChange={(e) => set('shopLabel', e.target.value)} placeholder="Shop All" />
            </Field>
            <Field label="Shop All button link" htmlFor="cat-shop-href" hint="e.g. /products">
              <Input id="cat-shop-href" value={s.shopHref} onChange={(e) => set('shopHref', e.target.value)} placeholder="/products" />
            </Field>
          </div>
        </div>
        <div className="mt-5">
          <Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
