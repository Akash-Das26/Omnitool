import { type QrErrorCorrection, renderQrPngDataUrl, renderQrSvg } from '@omnitool/tool-core';
import { DownloadIcon, RefreshCwIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OutputList, OutputRow } from '@/components/output-row';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
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
import { copyText, dataUrlToBlob, downloadBlob } from '@/lib/download';
import { requireTool } from '@/lib/tool';

const DEFAULTS = {
  text: 'https://example.com',
  size: '512',
  margin: '2',
  errorCorrection: 'M' as QrErrorCorrection,
};

export default function QrGennyTool() {
  const tool = requireTool('qr-genny');
  const [text, setText] = useState(DEFAULTS.text);
  const [size, setSize] = useState(DEFAULTS.size);
  const [margin, setMargin] = useState(DEFAULTS.margin);
  const [errorCorrection, setErrorCorrection] = useState<QrErrorCorrection>(
    DEFAULTS.errorCorrection,
  );
  const [png, setPng] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const generate = useCallback(async () => {
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const options = {
        size: Number(size),
        margin: Number(margin),
        errorCorrection,
      };
      const [nextPng, nextSvg] = await Promise.all([
        renderQrPngDataUrl(text, options),
        renderQrSvg(text, options),
      ]);
      if (id !== requestId.current) return;
      setPng(nextPng);
      setSvg(nextSvg);
    } catch (cause) {
      if (id !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : 'Could not make that QR code');
      setPng(null);
      setSvg(null);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, [errorCorrection, margin, size, text]);

  useEffect(() => {
    void generate();
  }, [generate]);

  function reset() {
    setText(DEFAULTS.text);
    setSize(DEFAULTS.size);
    setMargin(DEFAULTS.margin);
    setErrorCorrection(DEFAULTS.errorCorrection);
  }

  function downloadPng() {
    if (!png) return;
    downloadBlob(dataUrlToBlob(png), 'qr-code.png');
  }

  function downloadSvg() {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <>
          <Button type="button" onClick={downloadPng} disabled={!png}>
            <DownloadIcon aria-hidden="true" className="size-4" />
            Download PNG
          </Button>
          <Button type="button" variant="outline" onClick={downloadSvg} disabled={!svg}>
            <DownloadIcon aria-hidden="true" className="size-4" />
            Download SVG
          </Button>
        </>
      }
    >
      <ToolStage title="Input">
        <div className="space-y-2">
          <Label htmlFor="qr-text">Text or URL</Label>
          <Input
            id="qr-text"
            value={text}
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            placeholder="https://example.com"
          />
          <p className="text-sm text-muted-foreground">
            {text.trim().length} characters. Keep it short so the code stays easy to scan.
          </p>
        </div>
      </ToolStage>

      <ToolStage title="Options">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="qr-size">Size (px)</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id="qr-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="256">256</SelectItem>
                <SelectItem value="512">512</SelectItem>
                <SelectItem value="1024">1024</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr-margin">Quiet zone</Label>
            <Select value={margin} onValueChange={setMargin}>
              <SelectTrigger id="qr-margin" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="2">Small</SelectItem>
                <SelectItem value="4">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr-error">Error correction</Label>
            <Select
              value={errorCorrection}
              onValueChange={(value) => setErrorCorrection(value as QrErrorCorrection)}
            >
              <SelectTrigger id="qr-error" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (7%)</SelectItem>
                <SelectItem value="M">Medium (15%)</SelectItem>
                <SelectItem value="Q">Quartile (25%)</SelectItem>
                <SelectItem value="H">High (30%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void generate()} disabled={busy}>
            <RefreshCwIcon aria-hidden="true" className="size-4" />
            {busy ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </ToolStage>

      <ToolStage title="Output">
        {error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex min-h-40 min-w-40 items-center justify-center rounded-panel border border-border bg-white p-3">
            {png ? (
              <img
                src={png}
                alt={`QR code for ${text.trim() || 'the entered text'}`}
                width={192}
                height={192}
                className="size-48"
              />
            ) : (
              <span className="text-sm text-muted-foreground">No code yet</span>
            )}
          </div>
          <OutputList className="w-full min-w-0 flex-1 rounded-control border border-border">
            {' '}
            <OutputRow label="PNG image" mono={false}>
              <p className="mt-1 text-sm">
                {size} × {size} pixels, plus the quiet zone
              </p>
            </OutputRow>
            <OutputRow label="SVG image" mono={false}>
              <p className="mt-1 text-sm">Vector, scales to any size</p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                disabled={!svg}
                onClick={() => {
                  if (svg) void copyText(svg);
                }}
              >
                Copy SVG markup
              </Button>
            </OutputRow>
          </OutputList>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          The code is drawn in this tab. The text and the image are never uploaded.
        </p>
      </ToolStage>
    </ToolFrame>
  );
}
