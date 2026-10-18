import {
  decodeBase64,
  decodeHex,
  decodeHtml,
  decodeUrl,
  EncodingError,
  encodeBase64,
  encodeHex,
  encodeHtml,
  encodeUrl,
} from '@omnitool/tool-core';
import { useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';

type Mode = 'base64' | 'url' | 'html' | 'hex';
type Direction = 'encode' | 'decode';

const LABELS: Record<Mode, string> = {
  base64: 'Base64',
  url: 'URL component',
  html: 'HTML entities',
  hex: 'Hexadecimal',
};

const ENCODERS: Record<Mode, (value: string) => string> = {
  base64: encodeBase64,
  url: encodeUrl,
  html: encodeHtml,
  hex: encodeHex,
};

const DECODERS: Record<Mode, (value: string) => string> = {
  base64: decodeBase64,
  url: decodeUrl,
  html: decodeHtml,
  hex: decodeHex,
};

const EXAMPLES: Record<Mode, string> = {
  base64: 'Hello, café 🌍',
  url: 'search terms & symbols/é',
  html: '<p class="note">Tom & Jerry\'s</p>',
  hex: 'Hello, café 🌍',
};

export default function EncoderTool() {
  const tool = requireTool('encoder');
  const [mode, setMode] = useState<Mode>('base64');
  const [direction, setDirection] = useState<Direction>('encode');
  const [input, setInput] = useState(EXAMPLES.base64);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function convert() {
    try {
      const transform = direction === 'encode' ? ENCODERS[mode] : DECODERS[mode];
      setOutput(transform(input));
      setError(null);
    } catch (cause) {
      setOutput('');
      setError(
        cause instanceof EncodingError ? cause.message : 'That value could not be converted',
      );
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setInput(EXAMPLES[next]);
    setOutput('');
    setError(null);
  }

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Input">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="encoder-mode">Encoding</Label>
              <Select value={mode} onValueChange={(value) => switchMode(value as Mode)}>
                <SelectTrigger id="encoder-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LABELS) as Mode[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="encoder-direction">Direction</Label>
              <Select
                value={direction}
                onValueChange={(value) => {
                  setDirection(value as Direction);
                  setOutput('');
                  setError(null);
                }}
              >
                <SelectTrigger id="encoder-direction" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encode">Encode</SelectItem>
                  <SelectItem value="decode">Decode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="encoder-input">
              {direction === 'encode' ? 'Text' : 'Encoded value'}
            </Label>
            <TextArea
              id="encoder-input"
              className="mt-2"
              rows={6}
              value={input}
              spellCheck={false}
              onChange={(event) => setInput(event.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={convert} disabled={input === ''}>
              {direction === 'encode' ? 'Encode' : 'Decode'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOutput('');
                setError(null);
              }}
              disabled={output === '' && error === null}
            >
              Clear result
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Text is treated as UTF-8, so accents, emoji and non-Latin scripts round-trip correctly.
          </p>
        </ToolStage>

        <ToolStage title="Output">
          {error ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Label htmlFor="encoder-output">
            {direction === 'encode' ? `${LABELS[mode]} output` : 'Decoded text'}
          </Label>
          <TextArea
            id="encoder-output"
            className="mt-2"
            rows={6}
            readOnly
            value={output}
            spellCheck={false}
            placeholder="The converted value appears here."
          />
          <div className="mt-3">
            <OutputActions
              text={output}
              filename={`${mode}-${direction === 'encode' ? 'encoded' : 'decoded'}.txt`}
              disabled={output === ''}
            />
          </div>
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
