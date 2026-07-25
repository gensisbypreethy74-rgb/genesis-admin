'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button, Card, CardHeader, PageHeader, Field, Input, Textarea, Select, Thumb, IconButton, Spinner } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';
import PiecesManager from '../products/_components/PiecesManager';

interface Step { number: string; title: string; description: string }
interface Seasonal {
  eyebrow: string; heading: string; description: string;
  ctaLabel: string; ctaHref: string; productIds: string[];
}
interface Moment {
  eyebrow: string; title: string; body: string;
  shopLabel: string; shopHref: string; explainerEyebrow: string; steps: Step[];
  seasonal: Seasonal;
}
interface CatalogueProduct { _id: string; name: string; images?: string[] }

export default function MomentPage() {
  const [m, setM] = useState<Moment | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPieces, setShowPieces] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([api.get('/moment'), api.get('/products')]);
      if (mRes.data?.success) setM(mRes.data.data);
      if (pRes.data?.success) setCatalogue(pRes.data.data || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load the Moment section.'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Keep the seasonal picker's product list current after a piece is added or
  // removed via the embedded manager below.
  const refreshCatalogue = useCallback(async () => {
    try {
      const res = await api.get('/products');
      if (res.data?.success) setCatalogue(res.data.data || []);
    } catch {
      /* non-fatal — the picker just keeps its previous list */
    }
  }, []);

  const set = (k: keyof Moment, v: string) => setM((p) => (p ? { ...p, [k]: v } : p));
  const setStep = (i: number, k: keyof Step, v: string) =>
    setM((p) => (p ? { ...p, steps: p.steps.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) } : p));
  const setSeasonal = (k: keyof Seasonal, v: string) =>
    setM((p) => (p ? { ...p, seasonal: { ...p.seasonal, [k]: v } } : p));

  // Product assignment
  const productById = new Map(catalogue.map((p) => [p._id, p]));
  const assignedIds = m?.seasonal.productIds ?? [];
  const unassigned = catalogue.filter((p) => !assignedIds.includes(p._id));

  const setIds = (ids: string[]) =>
    setM((p) => (p ? { ...p, seasonal: { ...p.seasonal, productIds: ids } } : p));
  const addProduct = (id: string) => { if (id && !assignedIds.includes(id)) setIds([...assignedIds, id]); };
  const removeProduct = (id: string) => setIds(assignedIds.filter((x) => x !== id));
  const moveProduct = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= assignedIds.length) return;
    const next = [...assignedIds];
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  };

  const save = async () => {
    if (!m) return;
    if (!m.seasonal.heading.trim()) return toast.error('The seasonal collection needs a heading.');
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

      {/* Seasonal Collection Showcase */}
      <Card className="p-5 sm:p-6">
        <CardHeader eyebrow="Seasonal Collection" title="Now · The Onam Collection carousel" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Field label="Section label" htmlFor="sc-eyebrow"><Input id="sc-eyebrow" value={m.seasonal.eyebrow} onChange={(e) => setSeasonal('eyebrow', e.target.value)} placeholder="Now · The Onam Collection" /></Field>
          <Field label="Main heading" htmlFor="sc-heading" required><Input id="sc-heading" value={m.seasonal.heading} onChange={(e) => setSeasonal('heading', e.target.value)} placeholder="Named for the flowers of the season." /></Field>
          <Field label="Description" htmlFor="sc-desc" className="lg:col-span-2"><Textarea id="sc-desc" rows={2} value={m.seasonal.description} onChange={(e) => setSeasonal('description', e.target.value)} /></Field>
          <Field label="Button text" htmlFor="sc-cta-label"><Input id="sc-cta-label" value={m.seasonal.ctaLabel} onChange={(e) => setSeasonal('ctaLabel', e.target.value)} placeholder="View All Pieces" /></Field>
          <Field label="Button link" htmlFor="sc-cta-href"><Input id="sc-cta-href" value={m.seasonal.ctaHref} onChange={(e) => setSeasonal('ctaHref', e.target.value)} placeholder="/products" /></Field>
        </div>

        {/* Product assignment */}
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <span className="text-[13px] font-medium text-ink">
              Products in the carousel <span className="text-faint">({assignedIds.length})</span>
            </span>
            <div className="w-full sm:w-72">
              <Select value="" onChange={(e) => addProduct(e.target.value)} aria-label="Add product">
                <option value="">+ Add a product…</option>
                {unassigned.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {assignedIds.length === 0 ? (
            <p className="text-[12px] text-faint">
              No products assigned — the carousel falls back to landing-page pieces. Add products above to curate it.
            </p>
          ) : (
            <div className="space-y-2">
              {assignedIds.map((id, i) => {
                const p = productById.get(id);
                return (
                  <div key={id} className="flex items-center gap-3 border border-line bg-cream/60 p-2 sm:p-3">
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => moveProduct(i, -1)} disabled={i === 0} className="text-faint hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
                      <button onClick={() => moveProduct(i, 1)} disabled={i === assignedIds.length - 1} className="text-faint hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
                    </div>
                    <Thumb src={p?.images?.[0]} alt={p?.name || ''} ratio="aspect-square" className="w-11 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-[14px] text-ink">
                      {p ? p.name : <span className="text-danger">Deleted product ({id.slice(-6)})</span>}
                    </span>
                    <IconButton label="Remove from carousel" tone="danger" onClick={() => removeProduct(id)}><X size={14} /></IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5"><Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button></div>
      </Card>

      {/* Full piece management — the same catalogue + form as the Pieces page.
          Collapsed by default so it doesn't stretch this page into a long scroll;
          expands on demand. */}
      <div className="mt-8">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow text-bronze-deep mb-1">The Edit</p>
            <h2 className="font-display text-2xl text-ink mb-1">Manage Pieces</h2>
            <p className="font-sans text-[13px] text-muted">
              Add, edit or remove any garment. Then assign it to the carousel above.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPieces((v) => !v)}>
            {showPieces ? 'Hide pieces' : 'Manage pieces'}
          </Button>
        </div>
        {showPieces && (
          <div className="mt-4">
            <PiecesManager onChanged={refreshCatalogue} />
          </div>
        )}
      </div>
    </div>
  );
}
