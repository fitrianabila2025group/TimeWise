'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

interface AdsSettings {
  id: string;
  provider: string;
  adsenseClientId: string;
  adsTxtLines: string;
  headHtml: string;
  bodyHtml: string;
  slotsJson: string;
  verificationMeta: string;
}

const providers = [
  { value: 'adsense', label: 'Google AdSense' },
  { value: 'adsterra', label: 'Adsterra' },
  { value: 'monetag', label: 'Monetag' },
  { value: 'hilltopads', label: 'HilltopAds' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_SLOTS = '{\n  "header": "",\n  "sidebar": "",\n  "inContent": "",\n  "footer": ""\n}';

export default function AdminAdsPage() {
  const [settings, setSettings] = useState<AdsSettings | null>(null);
  const [form, setForm] = useState<Partial<AdsSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/ads');
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      const s = d.settings || {};
      // Pretty-print slotsJson for editing
      let slotsJson = s.slotsJson || DEFAULT_SLOTS;
      try {
        slotsJson = JSON.stringify(JSON.parse(slotsJson), null, 2);
      } catch { /* keep as-is */ }
      setForm({ ...s, slotsJson });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function validateSlots(val: string) {
    try {
      JSON.parse(val);
      setSlotsError('');
    } catch {
      setSlotsError('Invalid JSON');
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (slotsError) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/admin/ads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchData();
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to save');
    }
  }

  if (!settings) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ads Manager</h1>

      <form onSubmit={saveSettings} className="space-y-6">
        {/* Provider Selection */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold">Ad Provider</h2>
            <div>
              <Label>Provider</Label>
              <select
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={form.provider || 'custom'}
                onChange={e => setForm({ ...form, provider: e.target.value })}
              >
                {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* AdSense Settings */}
        {form.provider === 'adsense' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="font-semibold">Google AdSense</h2>
              <div>
                <Label>Client ID</Label>
                <Input
                  value={form.adsenseClientId || ''}
                  onChange={e => setForm({ ...form, adsenseClientId: e.target.value })}
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                />
                <p className="text-xs text-muted-foreground mt-1">Your AdSense publisher client ID</p>
              </div>
              <div>
                <Label>Verification Meta</Label>
                <Input
                  value={form.verificationMeta || ''}
                  onChange={e => setForm({ ...form, verificationMeta: e.target.value })}
                  placeholder="google-adsense-account=ca-pub-..."
                />
                <p className="text-xs text-muted-foreground mt-1">Format: name=content (added as meta tag)</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ad Slots (JSON) */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold">Ad Slot Configuration</h2>
            <p className="text-sm text-muted-foreground">
              JSON object mapping position names to HTML snippets. Supported positions:
              <code className="ml-1">header</code>, <code>sidebar</code>, <code>inContent</code>, <code>footer</code>.
            </p>
            <Textarea
              value={form.slotsJson || DEFAULT_SLOTS}
              onChange={e => {
                setForm({ ...form, slotsJson: e.target.value });
                validateSlots(e.target.value);
              }}
              rows={10}
              className="font-mono text-xs"
              placeholder={DEFAULT_SLOTS}
            />
            {slotsError && <p className="text-xs text-red-500">{slotsError}</p>}
          </CardContent>
        </Card>

        {/* ads.txt */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold">ads.txt</h2>
            <p className="text-sm text-muted-foreground">
              Content served at <code>/ads.txt</code> for ad network verification
            </p>
            <Textarea
              value={form.adsTxtLines || ''}
              onChange={e => setForm({ ...form, adsTxtLines: e.target.value })}
              rows={6}
              className="font-mono text-xs"
              placeholder="google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0"
            />
          </CardContent>
        </Card>

        {/* Custom HTML */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold">Custom HTML Injection</h2>
            <div>
              <Label>Head HTML</Label>
              <Textarea
                value={form.headHtml || ''}
                onChange={e => setForm({ ...form, headHtml: e.target.value })}
                rows={4}
                className="font-mono text-xs"
                placeholder="<script>...</script>"
              />
              <p className="text-xs text-muted-foreground mt-1">Injected before {'</head>'}</p>
            </div>
            <div>
              <Label>Body HTML</Label>
              <Textarea
                value={form.bodyHtml || ''}
                onChange={e => setForm({ ...form, bodyHtml: e.target.value })}
                rows={4}
                className="font-mono text-xs"
                placeholder="<script>...</script>"
              />
              <p className="text-xs text-muted-foreground mt-1">Injected before {'</body>'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving || !!slotsError}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
          {saved && <span className="text-sm text-green-600">Settings saved!</span>}
        </div>
      </form>
    </div>
  );
}
