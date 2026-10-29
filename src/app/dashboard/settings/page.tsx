'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Spinner } from '@/components/ui';
import { api, toastApiError } from '@/lib/api';

interface SiteSettings {
  whatsappNumber: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/site-settings', { params: { t: Date.now() } });
      if (res.data?.success) setSettings(res.data.data);
    } catch (e) {
      toastApiError(e, 'Could not load site settings.');
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

  const set = (k: keyof SiteSettings, v: string) => setSettings((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!settings) return;
    if (!settings.whatsappNumber.trim()) return toast.error('WhatsApp number is required.');
    
    setSaving(true);
    try {
      const res = await api.put('/site-settings', settings);
      if (res.data?.success) {
        setSettings(res.data.data);
        toast.success('Settings updated');
      }
    } catch (e) {
      toastApiError(e, 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !settings) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <p className="font-sans text-[13px] text-danger mb-4">Could not load settings. Please try again later.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!settings) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="The Studio"
        title="Settings"
        description="Site-wide configuration, starting with contact information."
        action={<Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>}
      />

      <Card className="p-5 sm:p-6 max-w-2xl">
        <CardHeader eyebrow="Contact" title="WhatsApp" />
        <div className="space-y-4 mt-4">
          <Field 
            label="WhatsApp Number" 
            htmlFor="whatsapp-number" 
            hint="Include country code without the plus sign, e.g. 917736830303"
            required
          >
            <Input 
              id="whatsapp-number" 
              value={settings.whatsappNumber} 
              onChange={(e) => set('whatsappNumber', e.target.value)} 
              placeholder="917736830303"
            />
          </Field>
        </div>
        <div className="mt-5">
          <Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
