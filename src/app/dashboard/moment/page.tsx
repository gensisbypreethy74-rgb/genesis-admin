'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Textarea, Spinner } from '@/components/ui';
import { api, toastApiError } from '@/lib/api';

interface Step { number: string; title: string; description: string }
interface Seasonal {
  eyebrow: string; heading: string; description: string;
  ctaLabel: string; ctaHref: string;
}
interface Moment {
  eyebrow: string; title: string; body: string;
  shopLabel: string; shopHref: string; explainerEyebrow: string; steps: Step[];
  seasonal: Seasonal;
}

/**
 * This page edits The Moment's copy only. Which pieces appear in the section is
 * decided in the Products module — a piece is in The Moment when its Category is
 * "The Moment" — so there is deliberately no product picker or piece manager
 * here. Two places to add a product meant a curated list could silently outrank
 * a freshly filed piece.
 */
export default function MomentPage() {
  const [m, setM] = useState<Moment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/moment');
      if (res.data?.success) setM(res.data.data);
    } catch (e) {
      toastApiError(e, 'Could not load the Moment section.');
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

  const set = (k: keyof Moment, v: string) => setM((p) => (p ? { ...p, [k]: v } : p));
  const setStep = (i: number, k: keyof Step, v: string) =>
    setM((p) => (p ? { ...p, steps: p.steps.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) } : p));
  const setSeasonal = (k: keyof Seasonal, v: string) =>
    setM((p) => (p ? { ...p, seasonal: { ...p.seasonal, [k]: v } } : p));

  const save = async () => {
    if (!m) return;
    if (!m.seasonal.heading.trim()) return toast.error('The seasonal collection needs a heading.');
    setSaving(true);
    try {
      const res = await api.put('/moment', m);
      if (res.data?.success) { setM(res.data.data); toast.success('The Moment updated'); }
    } catch (e) {
      // Includes the server's 400s, e.g. "Links must start with / or https://".
      toastApiError(e, 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !m) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <p className="font-sans text-[13px] text-danger mb-4">Could not load the Moment section.</p>
        <Button variant="outline" size="sm" onClick={() => { setError(false); void load(); }}>Retry</Button>
      </div>
    );
  }

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

      <Card className="mb-6 p-5 sm:p-6">
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
      </Card>

      {/* Header copy for the product showcase. The pieces themselves come from
          the Products module — see the note on this component. */}
      <Card className="p-5 sm:p-6">
        <CardHeader eyebrow="Product showcase" title="Heading above the pieces" />
        <p className="font-sans text-[13px] text-muted mt-1 max-w-2xl">
          Wording only. To put a piece in The Moment, open{' '}
          <span className="text-ink">Pieces</span> and set its Category to{' '}
          <span className="text-ink">The Moment</span> — it appears here and on the
          storefront straight away, newest first.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Field label="Section label" htmlFor="sc-eyebrow"><Input id="sc-eyebrow" value={m.seasonal.eyebrow} onChange={(e) => setSeasonal('eyebrow', e.target.value)} placeholder="Now · The Onam Collection" /></Field>
          <Field label="Main heading" htmlFor="sc-heading" required><Input id="sc-heading" value={m.seasonal.heading} onChange={(e) => setSeasonal('heading', e.target.value)} placeholder="Named for the flowers of the season." /></Field>
          <Field label="Description" htmlFor="sc-desc" className="lg:col-span-2"><Textarea id="sc-desc" rows={2} value={m.seasonal.description} onChange={(e) => setSeasonal('description', e.target.value)} /></Field>
          <Field label="Button text" htmlFor="sc-cta-label"><Input id="sc-cta-label" value={m.seasonal.ctaLabel} onChange={(e) => setSeasonal('ctaLabel', e.target.value)} placeholder="View All Pieces" /></Field>
          <Field label="Button link" htmlFor="sc-cta-href"><Input id="sc-cta-href" value={m.seasonal.ctaHref} onChange={(e) => setSeasonal('ctaHref', e.target.value)} placeholder="/products" /></Field>
        </div>

        <div className="mt-5"><Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button></div>
      </Card>
    </div>
  );
}
