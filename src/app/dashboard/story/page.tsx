'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, ArrowUp, ArrowDown, Plus, BookOpen, ExternalLink } from 'lucide-react';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
  Field,
  Input,
  Textarea,
  Toggle,
  StatusBadge,
  ConfirmDialog,
  EmptyState,
  IconButton,
  SkeletonTable,
} from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';
import { IStorySection, IStorySettings, sectionTypeLabel, sectionSummary } from './_components/types';
import SectionForm from './_components/SectionForm';

const STOREFRONT_STORY_URL =
  (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000') + '/story';

export default function StoryPage() {
  const [sections, setSections] = useState<IStorySection[]>([]);
  const [settings, setSettings] = useState<IStorySettings>({});
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IStorySection | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  // SEO / intro settings form
  const [savingSettings, setSavingSettings] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('story');
  const [introEyebrow, setIntroEyebrow] = useState('');
  const [introHeading, setIntroHeading] = useState('');
  const [introDescription, setIntroDescription] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/story/admin');
      if (res.data?.success) {
        const data = res.data.data;
        setSections(data.sections || []);
        const s: IStorySettings = data.settings || {};
        setSettings(s);
        setMetaTitle(s.metaTitle || '');
        setMetaDescription(s.metaDescription || '');
        setSlug(s.slug || 'story');
        setIntroEyebrow(s.introEyebrow || '');
        setIntroHeading(s.introHeading || '');
        setIntroDescription(s.introDescription || '');
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load the Story page.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: IStorySection) => {
    setEditing(s);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const onSaved = () => {
    closeForm();
    load();
  };

  const togglePublish = async (s: IStorySection) => {
    // Optimistic flip so the toggle feels instant.
    setSections((prev) =>
      prev.map((x) => (x._id === s._id ? { ...x, status: x.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' } : x))
    );
    try {
      await api.patch(`/story/sections/${s._id}/toggle`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change status'));
      load(); // resync on failure
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next); // optimistic
    setReordering(true);
    try {
      await api.put('/story/sections/reorder', {
        items: next.map((s, i) => ({ id: s._id, order: i })),
      });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not reorder'));
      load();
    } finally {
      setReordering(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/story/sections/${deleteId}`);
      if (res.data?.success) {
        toast.success('Section deleted');
        setDeleteId(null);
        load();
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not delete section'));
    } finally {
      setDeleting(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await api.put('/story/settings', {
        metaTitle,
        metaDescription,
        slug,
        introEyebrow,
        introHeading,
        introDescription,
      });
      if (res.data?.success) {
        setSettings(res.data.data);
        toast.success('Story settings saved');
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Storefront"
        title="Story Page"
        description="Compose the storefront Story page — add, edit, reorder, and publish sections. Changes appear on the live page immediately."
        action={
          <div className="flex items-center gap-2">
            <ButtonLink href={STOREFRONT_STORY_URL} variant="ghost" size="sm" target="_blank">
              <span className="inline-flex items-center gap-1.5">
                View live <ExternalLink size={13} />
              </span>
            </ButtonLink>
            <Button variant="solid" size="sm" onClick={openCreate}>
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} /> Add Section
              </span>
            </Button>
          </div>
        }
      />

      {/* SEO / intro settings */}
      <Card className="mb-6 p-5 sm:p-6">
        <CardHeader eyebrow="Page Settings" title="SEO & Intro" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Field label="Meta title" htmlFor="s-meta-title" hint="Browser tab + search result title.">
            <Input id="s-meta-title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Story · Genesis by Preethy" />
          </Field>
          <Field label="URL slug" htmlFor="s-slug" hint="The page path segment.">
            <Input id="s-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="story" />
          </Field>
          <Field label="Meta description" htmlFor="s-meta-desc" className="lg:col-span-2" hint="The search-result snippet (~155 chars).">
            <Textarea id="s-meta-desc" rows={2} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </Field>
          <Field label="Intro eyebrow" htmlFor="s-intro-eyebrow">
            <Input id="s-intro-eyebrow" value={introEyebrow} onChange={(e) => setIntroEyebrow(e.target.value)} placeholder="Story · Genesis by Preethy" />
          </Field>
          <Field label="Intro heading" htmlFor="s-intro-heading" hint="The H1 at the top of the page.">
            <Input id="s-intro-heading" value={introHeading} onChange={(e) => setIntroHeading(e.target.value)} placeholder="Clothing for the adult who has stopped dressing to impress." />
          </Field>
          <Field label="Intro description" htmlFor="s-intro-desc" className="lg:col-span-2" hint="The paragraph under the intro heading.">
            <Textarea id="s-intro-desc" rows={2} value={introDescription} onChange={(e) => setIntroDescription(e.target.value)} placeholder="Genesis by Preethy is natural clothing for tropical climates, made in Kochi, Kerala — and for a life that no longer needs to perform." />
          </Field>
        </div>
        <div className="mt-5">
          <Button variant="solid" size="sm" onClick={saveSettings} loading={savingSettings}>
            Save settings
          </Button>
        </div>
      </Card>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Section list */}
        <Card padded={false} className="flex-1 min-w-0 w-full p-5 sm:p-6">
          {loading ? (
            <SkeletonTable rows={4} cols={3} />
          ) : sections.length === 0 ? (
            <EmptyState
              title="No sections yet"
              message="The storefront shows its default editorial content until you add sections here. Add one to take control."
              icon={<BookOpen size={18} aria-hidden />}
              action={
                <Button variant="solid" size="sm" onClick={openCreate}>
                  Add Section
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {sections.map((s, i) => (
                <div
                  key={s._id}
                  className="flex items-center gap-3 border border-line bg-cream/60 p-3 sm:p-4"
                >
                  {/* Reorder */}
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || reordering}
                      className="text-faint hover:text-ink disabled:opacity-30 disabled:hover:text-faint"
                      aria-label="Move up"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === sections.length - 1 || reordering}
                      className="text-faint hover:text-ink disabled:opacity-30 disabled:hover:text-faint"
                      aria-label="Move down"
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-bronze-deep">
                        {sectionTypeLabel(s.type)}
                      </span>
                      <StatusBadge
                        status={s.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                        tone={s.status === 'PUBLISHED' ? 'success' : 'neutral'}
                      />
                    </div>
                    <p className="text-ink text-[14px] mt-1 truncate">{sectionSummary(s)}</p>
                  </div>

                  {/* Publish toggle */}
                  <div className="shrink-0 hidden sm:block">
                    <Toggle
                      checked={s.status === 'PUBLISHED'}
                      onChange={() => togglePublish(s)}
                      label=""
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton label="Edit section" onClick={() => openEdit(s)}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton label="Delete section" tone="danger" onClick={() => setDeleteId(s._id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Form panel */}
        {formOpen && <SectionForm section={editing} onSaved={onSaved} onClose={closeForm} />}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete section?"
        message="This section will be removed from the Story page immediately. This action cannot be undone."
        confirmLabel="Delete section"
        loading={deleting}
      />
    </div>
  );
}
