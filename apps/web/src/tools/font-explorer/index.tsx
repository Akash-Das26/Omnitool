import { formatBytes } from '@omnitool/tool-core';
import * as Comlink from 'comlink';
import { useEffect, useRef, useState } from 'react';
import { FileIntake } from '@/components/file-intake';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';
import { createWorkerJob } from '@/lib/worker/job';
import { FONT_EXTENSIONS, type FontInspectInput, type FontReport, MAX_FONT_BYTES } from './types';
import type { FontWorkerApi } from './worker';

const DEFAULT_SPECIMEN = 'Handgloves 0123\nThe quick brown fox jumps over the lazy dog.';

interface LoadedFont {
  readonly report: FontReport;
  readonly family: string;
  readonly bytes: number;
  readonly filename: string;
}

export default function FontExplorerTool() {
  const tool = requireTool('font-explorer');
  const [font, setFont] = useState<LoadedFont | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [specimen, setSpecimen] = useState(DEFAULT_SPECIMEN);
  const [size, setSize] = useState(48);
  const [weight, setWeight] = useState(400);
  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  const faceRef = useRef<FontFace | null>(null);

  useEffect(
    () => () => {
      if (faceRef.current) document.fonts.delete(faceRef.current);
    },
    [],
  );

  async function load(file: File) {
    setError(null);
    if (file.size > MAX_FONT_BYTES) {
      setError('That file is larger than 50 MB. Choose a smaller font file.');
      return;
    }

    setBusy('Reading the font');
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const job = createWorkerJob<
      FontInspectInput,
      FontReport,
      {
        run: (
          input: FontInspectInput,
          onProgress: (progress: number, label?: string) => void,
        ) => Promise<FontReport>;
      }
    >({
      worker,
      remoteFactory: (handle) => {
        const api = Comlink.wrap<FontWorkerApi>(handle as Worker);
        return {
          run: (input: FontInspectInput, onProgress: (progress: number, label?: string) => void) =>
            api.inspect(input, onProgress),
        };
      },
      input: { buffer: await file.arrayBuffer(), filename: file.name },
      onProgress: (_progress, label) => setBusy(label ?? 'Reading the font'),
    });

    try {
      // The buffer is read once more for the preview, because the worker clone
      // may be detached by the browser after it is sent.
      const forPreview = await file.arrayBuffer();
      const report = await job.promise;

      const family = `omnitool-preview-${Math.random().toString(36).slice(2, 10)}`;
      const face = new FontFace(family, forPreview);
      await face.load();
      document.fonts.add(face);
      if (faceRef.current) document.fonts.delete(faceRef.current);
      faceRef.current = face;

      setFont({ report, family, bytes: file.size, filename: file.name });
      setAxisValues(Object.fromEntries(report.axes.map((axis) => [axis.tag, axis.default])));
      setWeight(
        report.axes.some((axis) => axis.tag === 'wght')
          ? (report.axes.find((a) => a.tag === 'wght')?.default ?? 400)
          : 400,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'That font could not be read. Try a TTF, OTF, WOFF or WOFF2 file.',
      );
      setFont(null);
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    if (faceRef.current) {
      document.fonts.delete(faceRef.current);
      faceRef.current = null;
    }
    setFont(null);
    setError(null);
    setBusy(null);
    setSpecimen(DEFAULT_SPECIMEN);
    setSize(48);
    setWeight(400);
    setAxisValues({});
  }

  const variation = font
    ? font.report.axes
        .map((axis) => `"${axis.tag}" ${axisValues[axis.tag] ?? axis.default}`)
        .join(', ')
    : '';

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Font file">
        <FileIntake
          accept={[...FONT_EXTENSIONS]}
          label="Font file"
          hint="TTF, OTF, WOFF or WOFF2, up to 50 MB. The file stays in this browser."
          buttonLabel="Choose a font"
          onFiles={(files) => {
            const file = files[0];
            if (file) void load(file);
          }}
        />
        {busy ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {busy}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {font ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {`${font.filename}, ${formatBytes(font.bytes)}. Nothing was uploaded or saved.`}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Choose a font to see its name table, glyph count, coverage and, if it has them, its
            variable axes.
          </p>
        )}
        <ToolHint>
          The file is parsed in a worker and given a random family name before the browser is asked
          to render it. Script coverage counts glyphs for a small sample of each script, so it says
          which scripts are present, not whether text in them will shape correctly.
        </ToolHint>
      </ToolStage>

      {font ? (
        <>
          <ToolStage title="Specimen">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="font-size">Size in px</Label>
                <Input
                  id="font-size"
                  type="number"
                  min={12}
                  max={200}
                  value={size}
                  onChange={(event) =>
                    setSize(Math.min(200, Math.max(12, Number(event.target.value) || 12)))
                  }
                />
              </div>
              <div>
                <Label htmlFor="font-weight">Weight</Label>
                <input
                  id="font-weight"
                  type="range"
                  min={100}
                  max={900}
                  step={100}
                  value={weight}
                  onChange={(event) => setWeight(Number(event.target.value))}
                  className="mt-3 w-full accent-primary"
                />
              </div>
            </div>

            {font.report.axes.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {font.report.axes.map((axis) => (
                  <div key={axis.tag}>
                    <Label htmlFor={`axis-${axis.tag}`}>
                      {`${axis.name || axis.tag} (${axis.tag}), ${axis.min} to ${axis.max}`}
                    </Label>
                    <input
                      id={`axis-${axis.tag}`}
                      type="range"
                      min={axis.min}
                      max={axis.max}
                      step={(axis.max - axis.min) / 100}
                      value={axisValues[axis.tag] ?? axis.default}
                      onChange={(event) =>
                        setAxisValues((current) => ({
                          ...current,
                          [axis.tag]: Number(event.target.value),
                        }))
                      }
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4">
              <Label htmlFor="font-specimen">Text</Label>
              <TextArea
                id="font-specimen"
                className="mt-2 min-h-24 font-sans"
                rows={3}
                value={specimen}
                onChange={(event) => setSpecimen(event.target.value)}
              />
            </div>

            <div
              className="mt-4 overflow-x-auto rounded-control border border-border bg-surface p-4"
              style={{
                fontFamily: `"${font.family}", system-ui, sans-serif`,
                fontSize: `${size}px`,
                fontWeight: weight,
                fontVariationSettings: variation === '' ? undefined : variation,
                lineHeight: 1.3,
                whiteSpace: 'pre-wrap',
              }}
            >
              {specimen}
            </div>
          </ToolStage>

          <ToolStage title="Name table">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ['Family', font.report.family],
                ['Subfamily', font.report.subfamily],
                ['Full name', font.report.fullName],
                ['PostScript name', font.report.postscriptName],
                ['Version', font.report.version],
                ['Designer', font.report.designer],
                ['Licence', font.report.licence],
                ['Copyright', font.report.copyright],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-words">{value === '' ? 'Not set in this font' : value}</dd>
                </div>
              ))}
            </dl>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Glyphs</dt>
                <dd className="font-mono">{font.report.glyphs.toLocaleString('en-GB')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Code points with a glyph</dt>
                <dd className="font-mono">{font.report.codePoints.toLocaleString('en-GB')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Units per em</dt>
                <dd className="font-mono">{font.report.unitsPerEm}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ascent and descent</dt>
                <dd className="font-mono">{`${font.report.ascent} / ${font.report.descent}`}</dd>
              </div>
            </dl>
          </ToolStage>

          <ToolStage title="Coverage">
            {font.report.scripts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None of the sampled scripts are covered by this font.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {font.report.scripts.map((script) => {
                  const share = Math.round((script.covered / script.sampled) * 100);
                  return (
                    <li key={script.name} className="flex items-center justify-between gap-4">
                      <span>{script.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {`${share}% of the sample (${script.covered} of ${script.sampled})`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </ToolStage>
        </>
      ) : null}
    </ToolFrame>
  );
}
