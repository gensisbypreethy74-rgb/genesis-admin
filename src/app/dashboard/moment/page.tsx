'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Textarea, Spinner } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';

interface Step { number: string; title: string; description: string }
interface Moment {
  eyebrow: string; title: string; body: string;
  shopLabel: string; shopHref: string; explainerEyebrow: string; steps: Step[];
}

export default function MomentPage() {
  const [m, setM] = useState<Moment | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/moment');
      if (res.data?.success) setM(res.data.data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load the Moment section.'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof Moment, v: string) => setM((p) => (p ? { ...p, [k]: v } : p));
  const setStep = (i: number, k: keyof Step, v: string) =>
    setM((p) => (p ? { ...p, steps: p.steps.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) } : p));

  const save = async () => {
    if (!m) return;
    setSaving(true);
    try {
      const res = await api.put('/moment', m);
      if (res.data?.success) { setM(res.data.data); toast.success('The Moment updated'); }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  if (!m) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Storefront"
        title="The Moment"
        description='The homepage "Moment" section. The "Preview the Edit" button is fixed and not editable.'
        action={<Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>}
      />

      <Card className="mb-6 p-5 sm:p-6">
        <CardHeader eyebrow="Hero" title="Headline & Copy" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Field label="Eyebrow" htmlFor="m-eyebrow"><Input id="m-eyebrow" value={m.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
          <Field label="Title" htmlFor="m-title"><Input id="m-title" value={m.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Body" htmlFor="m-body" className="lg:col-span-2" hint="Blank line = new paragraph."><Textarea id="m-body" rows={4} value={m.body} onChange={(e) => set('body', e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="mb-6 p-5 sm:p-6">
        <CardHeader eyebrow="Shop button" title="Shop the collection → filtered products" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Field label="Button label" htmlFor="m-shop-label"><Input id="m-shop-label" value={m.shopLabel} onChange={(e) => set('shopLabel', e.target.value)} /></Field>
          <Field label="Button link" htmlFor="m-shop-href" hint="e.g. /products?collection=onam or /products?category=…"><Input id="m-shop-href" value={m.shopHref} onChange={(e) => set('shopHref', e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader eyebrow="Three steps" title="How a Moment Works" />
        <Field label="Section label" htmlFor="m-explainer" className="mt-4"><Input id="m-explainer" value={m.explainerEyebrow} onChange={(e) => set('explainerEyebrow', e.target.value)} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {m.steps.map((s, i) => (
            <div key={i} className="border border-line p-4 space-y-3">
              <Field label={`Step ${i + 1} number`} htmlFor={`st-n-${i}`}><Input id={`st-n-${i}`} value={s.number} onChange={(e) => setStep(i, 'number', e.target.value)} /></Field>
              <Field label="Title" htmlFor={`st-t-${i}`}><Input id={`st-t-${i}`} value={s.title} onChange={(e) => setStep(i, 'title', e.target.value)} /></Field>
              <Field label="Description" htmlFor={`st-d-${i}`}><Textarea id={`st-d-${i}`} rows={3} value={s.description} onChange={(e) => setStep(i, 'description', e.target.value)} /></Field>
            </div>
          ))}
        </div>
        <div className="mt-5"><Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button></div>
      </Card>
    </div>
  );
}
