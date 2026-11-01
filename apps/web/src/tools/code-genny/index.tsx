import {
  type BarcodeResult,
  type BarcodeSymbology,
  barRects,
  contrastRatio,
  encodeBarcode,
} from '@omnitool/tool-core/barcode';
import { CheckIcon, CopyIcon, DownloadIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OutputList, OutputRow } from '@/components/output-row';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { copyText, downloadBlob } from '@/lib/download';
import { requireTool } from '@/lib/tool';

const DEFAULTS = {
  symbology: 'ean13' as BarcodeSymbology,
  value: '5901234123457',
  moduleWidth: '2',
  barHeight: '80',
  colours: 'ink',
};

const SYMBOLOGIES: readonly BarcodeSymbology[] = ['code128', 'ean13', 'upca', 'code39', 'itf'];

const SYMBOLOGY_COPY: Readonly<Record<BarcodeSymbology, { label: string; hint: string }>> = {
  code128: {
    label: 'Code 128',
    hint: 'Printable ASCII. All digits with an even count use the compact digit mode.',
  },
  ean13: { label: 'EAN-13', hint: '12 digits, or 13 with the check digit. What shops scan.' },
  upca: {
    label: 'UPC-A',
    hint: '11 digits, or 12 with the check digit. North American retail.',
  },
  code39: {
    label: 'Code 39',
    hint: 'A–Z, 0–9, space and - . $ / + %. Used on labels and inventory.',
  },
  itf: { label: 'ITF', hint: 'Digits in pairs. Cartons and ITF-14 trade units.' },
};

/**
 * Colour pairs taken from the DESIGN.md tokens. SVG needs literal values, so
 * the token each pair comes from is named here rather than dereferenced.
 */
const COLOUR_PAIRS = [
  { id: 'ink', label: 'Ink on Paper', bar: '#101828', background: '#EDF0F3' },
  { id: 'ink-white', label: 'Ink on white', bar: '#101828', background: '#FFFFFF' },
  { id: 'white-ink', label: 'White on ink', bar: '#FFFFFF', background: '#101828' },
  { id: 'cobalt', label: 'Cobalt on white', bar: '#2447F5', background: '#FFFFFF' },
] as const;

type ColourPair = (typeof COLOUR_PAIRS)[number];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The bar area in modules, and the full height including the text line. */
function geometry(result: BarcodeResult, moduleWidth: number, barHeight: number) {
  const modules = result.ok ? result.symbol.length : 0;
  return {
    width: modules * moduleWidth,
    height: barHeight + 24,
    bars: result.ok ? barRects(result.symbol) : [],
  };
}

function buildSvg(
  result: BarcodeResult,
  moduleWidth: number,
  barHeight: number,
  colours: ColourPair,
): string {
  if (!result.ok) return '';
  const { width, height, bars } = geometry(result, moduleWidth, barHeight);
  const rects = bars
    .map(
      (bar) =>
        `<rect x="${bar.x * moduleWidth}" y="0" width="${bar.width * moduleWidth}" height="${barHeight}" />`,
    )
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(result.symbology)} barcode for ${escapeXml(result.text)}">`,
    `<rect width="${width}" height="${height}" fill="${colours.background}" />`,
    `<g fill="${colours.bar}">${rects}</g>`,
    `<text x="${width / 2}" y="${barHeight + 16}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12" fill="${colours.bar}">${escapeXml(result.text)}</text>`,
    '</svg>',
  ].join('');
}

export default function CodeGennyTool() {
  const tool = requireTool('code-genny');
  const [symbology, setSymbology] = useState<BarcodeSymbology>(DEFAULTS.symbology);
  const [value, setValue] = useState(DEFAULTS.value);
  const [moduleWidth, setModuleWidth] = useState(DEFAULTS.moduleWidth);
  const [barHeight, setBarHeight] = useState(DEFAULTS.barHeight);
  const [colourId, setColourId] = useState<string>(DEFAULTS.colours);
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const colours = COLOUR_PAIRS.find((pair) => pair.id === colourId) ?? COLOUR_PAIRS[0];
  const scale = Math.max(1, Math.min(6, Number(moduleWidth) || 2));
  const height = Math.max(40, Math.min(240, Number(barHeight) || 80));

  const result = useMemo(
    () => encodeBarcode({ symbology, value, wideRatio: 3 }),
    [symbology, value],
  );
  const svg = useMemo(
    () => (result.ok ? buildSvg(result, scale, height, colours) : ''),
    [colours, height, result, scale],
  );
  const contrast = useMemo(() => contrastRatio(colours.bar, colours.background), [colours]);

  useEffect(() => {
    setCopied(false);
  }, []);

  function reset() {
    setSymbology(DEFAULTS.symbology);
    setValue(DEFAULTS.value);
    setModuleWidth(DEFAULTS.moduleWidth);
    setBarHeight(DEFAULTS.barHeight);
    setColourId(DEFAULTS.colours);
    setCopied(false);
  }

  function downloadSvg() {
    if (svg === '') return;
    downloadBlob(
      new Blob([svg], { type: 'image/svg+xml' }),
      `${symbology}-${result.ok ? result.text : 'barcode'}.svg`,
    );
  }

  function downloadPng() {
    if (!result.ok) return;
    const { width, bars } = geometry(result, scale, height);
    const element = canvas.current ?? document.createElement('canvas');
    element.width = width;
    element.height = height;
    const context = element.getContext('2d');
    if (!context) return;
    context.fillStyle = colours.background;
    context.fillRect(0, 0, width, height);
    context.fillStyle = colours.bar;
    for (const bar of bars) {
      context.fillRect(bar.x * scale, 0, bar.width * scale, height - 24);
    }
    context.font = '12px ui-monospace, monospace';
    context.textAlign = 'center';
    context.fillText(result.text, width / 2, height - 8);
    element.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${symbology}-${result.text}.png`);
    }, 'image/png');
  }

  const active = SYMBOLOGY_COPY[symbology];

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <>
          <Button type="button" onClick={downloadPng} disabled={!result.ok}>
            <DownloadIcon aria-hidden="true" className="size-4" />
            Download PNG
          </Button>
          <Button type="button" variant="outline" onClick={downloadSvg} disabled={!result.ok}>
            <DownloadIcon aria-hidden="true" className="size-4" />
            Download SVG
          </Button>
        </>
      }
    >
      <ToolStage title="Input">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="barcode-type">Barcode type</Label>
            <Select
              value={symbology}
              onValueChange={(next) => setSymbology(next as BarcodeSymbology)}
            >
              <SelectTrigger id="barcode-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLOGIES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {SYMBOLOGY_COPY[entry].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{active.hint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode-value">Text or digits</Label>
            <Input
              id="barcode-value"
              value={value}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setValue(event.target.value)}
              placeholder="5901234123457"
            />
          </div>
        </div>
      </ToolStage>

      <ToolStage title="Options">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="barcode-module">Bar width (px)</Label>
            <Select value={moduleWidth} onValueChange={setModuleWidth}>
              <SelectTrigger id="barcode-module" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['1', '2', '3', '4', '5', '6'].map((width) => (
                  <SelectItem key={width} value={width}>
                    {width}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode-height">Bar height (px)</Label>
            <Select value={barHeight} onValueChange={setBarHeight}>
              <SelectTrigger id="barcode-height" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['40', '60', '80', '120', '160'].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode-colours">Colours</Label>
            <Select value={colours.id} onValueChange={setColourId}>
              <SelectTrigger id="barcode-colours" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOUR_PAIRS.map((pair) => (
                  <SelectItem key={pair.id} value={pair.id}>
                    {pair.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {contrast < 4.5 ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {`These two colours have a contrast ratio of ${contrast.toFixed(1)}:1, below the 4.5:1 a scanner needs. Choose another pair.`}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {`Contrast between bars and background: ${contrast.toFixed(1)}:1.`}
          </p>
        )}
      </ToolStage>

      <ToolStage title="Output">
        {!result.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        ) : (
          <div className="space-y-4">
            <div
              className="overflow-x-auto rounded-panel border border-border p-3"
              style={{ background: colours.background }}
            >
              <svg
                role="img"
                aria-label={`${active.label} barcode for ${result.text}`}
                width={geometry(result, scale, height).width}
                height={height + 24}
                viewBox={`0 0 ${geometry(result, scale, height).width} ${height + 24}`}
                className="block max-w-full"
              >
                <rect
                  x={0}
                  y={0}
                  width={geometry(result, scale, height).width}
                  height={height + 24}
                  fill={colours.background}
                />
                {barRects(result.symbol).map((bar) => (
                  <rect
                    key={bar.x}
                    x={bar.x * scale}
                    y={0}
                    width={bar.width * scale}
                    height={height}
                    fill={colours.bar}
                  />
                ))}
                <text
                  x={geometry(result, scale, height).width / 2}
                  y={height + 16}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={12}
                  fill={colours.bar}
                >
                  {result.text}
                </text>
              </svg>
            </div>
            <OutputList className="rounded-control border border-border">
              <OutputRow label="Encoded text">
                <p className="mt-1 break-all font-mono text-sm">{result.text}</p>
              </OutputRow>
              {result.checkDigit ? (
                <OutputRow label="Check digit">
                  <p className="mt-1 font-mono text-sm">{result.checkDigit.digit}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.checkDigit.explanation}
                  </p>
                </OutputRow>
              ) : null}
              <OutputRow label="Size">
                <p className="mt-1 font-mono text-sm">
                  {`${geometry(result, scale, height).width} × ${height} px, ${result.symbol.length} modules, ${result.quietZone}-module quiet zone`}
                </p>
              </OutputRow>
              <OutputRow label="SVG">
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1"
                  onClick={() => {
                    void copyText(svg).then(() => setCopied(true));
                  }}
                >
                  {copied ? (
                    <CheckIcon aria-hidden="true" className="size-4" />
                  ) : (
                    <CopyIcon aria-hidden="true" className="size-4" />
                  )}
                  {copied ? 'Copied' : 'Copy SVG markup'}
                </Button>
              </OutputRow>
            </OutputList>
            {result.notes.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        <canvas ref={canvas} className="hidden" />
        <ToolHint>
          Check the printed code with a real scanner before a print run. Screen rendering cannot
          promise a reader will accept it: bar width, ink spread and the paper all matter.
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
