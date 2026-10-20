import {
  buildMetaTags,
  DESCRIPTION_TYPICAL_LENGTH,
  OG_TYPES,
  ROBOTS_VALUES,
  TITLE_TYPICAL_LENGTH,
  TWITTER_CARDS,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';

interface Form {
  title: string;
  description: string;
  canonical: string;
  language: string;
  robots: string;
  themeColour: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterSite: string;
}

const DEFAULTS: Form = {
  title: 'Omnitool — small tools, entirely in your browser',
  description: 'A local-only toolkit of small browser tools. No accounts, no uploads.',
  canonical: 'https://example.com/tools/',
  language: 'en-GB',
  robots: 'index, follow',
  themeColour: '#EDF0F3',
  ogTitle: '',
  ogDescription: '',
  ogImage: 'https://example.com/og.png',
  ogType: 'website',
  twitterCard: 'summary',
  twitterSite: '',
};

export default function MetaTagGennyTool() {
  const tool = requireTool('meta-tag-genny');
  const [form, setForm] = useState<Form>(DEFAULTS);

  const result = useMemo(() => buildMetaTags(form), [form]);
  const set = (key: keyof Form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function reset() {
    setForm(DEFAULTS);
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={result.html}
          filename="meta-tags.html"
          mime="text/html"
          disabled={result.html === ''}
        />
      }
    >
      <ToolStage title="Page">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="meta-title">
              Title
              <span className="ml-auto font-normal text-muted-foreground">
                {form.title.length} / {TITLE_TYPICAL_LENGTH} typical
              </span>
            </Label>
            <Input
              id="meta-title"
              value={form.title}
              onChange={(event) => set('title')(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-description">
              Description
              <span className="ml-auto font-normal text-muted-foreground">
                {form.description.length} / {DESCRIPTION_TYPICAL_LENGTH} typical
              </span>
            </Label>
            <TextArea
              id="meta-description"
              className="font-sans"
              rows={3}
              value={form.description}
              onChange={(event) => set('description')(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meta-canonical">Canonical URL</Label>
              <Input
                id="meta-canonical"
                type="url"
                inputMode="url"
                value={form.canonical}
                onChange={(event) => set('canonical')(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-language">Language</Label>
              <Input
                id="meta-language"
                value={form.language}
                placeholder="en-GB"
                onChange={(event) => set('language')(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-robots">Robots</Label>
              <Select value={form.robots} onValueChange={set('robots')}>
                <SelectTrigger id="meta-robots" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROBOTS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-theme">Theme colour</Label>
              <Input
                id="meta-theme"
                value={form.themeColour}
                placeholder="#EDF0F3"
                spellCheck={false}
                onChange={(event) => set('themeColour')(event.target.value)}
              />
            </div>
          </div>
          <ToolHint>
            Lengths are typical display limits, not rules: search engines and social platforms
            truncate at their own thresholds. URLs must be absolute and use https; nothing is
            fetched to check them.
          </ToolHint>
        </div>
      </ToolStage>

      <ToolStage title="Social preview">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meta-og-title">Open Graph title</Label>
            <Input
              id="meta-og-title"
              value={form.ogTitle}
              placeholder="Defaults to the title"
              onChange={(event) => set('ogTitle')(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-og-type">Open Graph type</Label>
            <Select value={form.ogType} onValueChange={set('ogType')}>
              <SelectTrigger id="meta-og-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OG_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="meta-og-description">Open Graph description</Label>
            <TextArea
              id="meta-og-description"
              className="font-sans"
              rows={2}
              value={form.ogDescription}
              placeholder="Defaults to the description"
              onChange={(event) => set('ogDescription')(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-og-image">Image URL</Label>
            <Input
              id="meta-og-image"
              type="url"
              inputMode="url"
              value={form.ogImage}
              onChange={(event) => set('ogImage')(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-twitter-card">Twitter card</Label>
            <Select value={form.twitterCard} onValueChange={set('twitterCard')}>
              <SelectTrigger id="meta-twitter-card" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TWITTER_CARDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-twitter-site">Site handle</Label>
            <Input
              id="meta-twitter-site"
              value={form.twitterSite}
              placeholder="@example"
              onChange={(event) => set('twitterSite')(event.target.value)}
            />
          </div>
        </div>
      </ToolStage>

      <ToolStage title="Snippet">
        {result.warnings.length > 0 ? (
          <ul className="mb-3 space-y-1 text-sm text-warning">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <Label htmlFor="meta-output">HTML for the document head</Label>
        <TextArea
          id="meta-output"
          className="mt-2"
          rows={12}
          readOnly
          value={result.html}
          placeholder="Fill in the fields above and the snippet appears here."
        />
      </ToolStage>
    </ToolFrame>
  );
}
