import {
  atbash,
  CipherError,
  caesar,
  railFence,
  rankCaesar,
  rot13,
  vigenere,
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

const CIPHERS = [
  { id: 'caesar', label: 'Caesar' },
  { id: 'rot13', label: 'ROT13' },
  { id: 'atbash', label: 'Atbash' },
  { id: 'vigenere', label: 'Vigenère' },
  { id: 'rail-fence', label: 'Rail fence' },
] as const;

type CipherId = (typeof CIPHERS)[number]['id'];

function attempt(run: () => string): { text: string; error: string | null } {
  try {
    return { text: run(), error: null };
  } catch (cause) {
    return {
      text: '',
      error: cause instanceof CipherError ? cause.message : 'That cipher could not run',
    };
  }
}

export default function DecoderTool() {
  const tool = requireTool('decoder');
  const [cipher, setCipher] = useState<CipherId>('caesar');
  const [text, setText] = useState('');
  const [shift, setShift] = useState('3');
  const [key, setKey] = useState('LEMON');
  const [vigenereDirection, setVigenereDirection] = useState<'encode' | 'decode'>('decode');
  const [rails, setRails] = useState('3');
  const [railDirection, setRailDirection] = useState<'encode' | 'decode'>('decode');

  const result = useMemo(() => {
    switch (cipher) {
      case 'caesar':
        return attempt(() => caesar(text, -Number(shift)));
      case 'rot13':
        return { text: rot13(text), error: null };
      case 'atbash':
        return { text: atbash(text), error: null };
      case 'vigenere':
        return attempt(() => vigenere(text, key, vigenereDirection));
      case 'rail-fence':
        return attempt(() => railFence(text, Number(rails), railDirection));
    }
  }, [cipher, text, shift, key, vigenereDirection, rails, railDirection]);

  const candidates = useMemo(() => (cipher === 'caesar' ? rankCaesar(text) : []), [cipher, text]);

  function reset() {
    setCipher('caesar');
    setText('');
    setShift('3');
    setKey('LEMON');
    setVigenereDirection('decode');
    setRails('3');
    setRailDirection('decode');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={result.text} filename="decoded.txt" disabled={result.text === ''} />
      }
    >
      <ToolStage title="Cipher">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="decoder-cipher">Method</Label>
            <Select value={cipher} onValueChange={(next) => setCipher(next as CipherId)}>
              <SelectTrigger id="decoder-cipher" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CIPHERS.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cipher === 'caesar' ? (
            <div className="space-y-2">
              <Label htmlFor="decoder-shift">Shift back by</Label>
              <Input
                id="decoder-shift"
                type="number"
                min={1}
                max={25}
                value={shift}
                onChange={(event) => setShift(event.target.value)}
              />
            </div>
          ) : null}

          {cipher === 'vigenere' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="decoder-key">Key</Label>
                <Input
                  id="decoder-key"
                  value={key}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => setKey(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="decoder-vigenere-direction">Direction</Label>
                <Select
                  value={vigenereDirection}
                  onValueChange={(next) => setVigenereDirection(next as 'encode' | 'decode')}
                >
                  <SelectTrigger id="decoder-vigenere-direction" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decode">Decode</SelectItem>
                    <SelectItem value="encode">Encode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {cipher === 'rail-fence' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="decoder-rails">Rails</Label>
                <Input
                  id="decoder-rails"
                  type="number"
                  min={2}
                  max={12}
                  value={rails}
                  onChange={(event) => setRails(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="decoder-rail-direction">Direction</Label>
                <Select
                  value={railDirection}
                  onValueChange={(next) => setRailDirection(next as 'encode' | 'decode')}
                >
                  <SelectTrigger id="decoder-rail-direction" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decode">Decode</SelectItem>
                    <SelectItem value="encode">Encode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <Label htmlFor="decoder-input">Text</Label>
          <TextArea
            id="decoder-input"
            className="mt-2"
            rows={6}
            value={text}
            spellCheck={false}
            placeholder="Paste the text to work on"
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <ToolHint>
          These ciphers only move Latin letters; digits, punctuation, spaces and accents are left
          exactly as they are. Vigenère and rail fence decode when their direction is set to decode.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Result">
        {result.error ? (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        ) : (
          <>
            <Label htmlFor="decoder-output">Plain text</Label>
            <TextArea
              id="decoder-output"
              className="mt-2"
              rows={6}
              readOnly
              value={result.text}
              placeholder="The result appears here."
            />
          </>
        )}
      </ToolStage>

      {cipher === 'caesar' ? (
        <ToolStage title="All 25 shifts">
          <p className="mb-3 text-sm text-muted-foreground">
            Ordered by how much each result looks like English. The best guess is first.
          </p>
          <ul className="space-y-1">
            {candidates.map((candidate, index) => (
              <li key={candidate.shift}>
                <button
                  type="button"
                  onClick={() => setShift(String(candidate.shift))}
                  className="flex w-full items-baseline gap-3 rounded-control px-2 py-1.5 text-left hover:bg-surface-hover"
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                    −{candidate.shift}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {candidate.text || '—'}
                  </span>
                  {index === 0 ? (
                    <span className="shrink-0 text-xs text-muted-foreground">likeliest</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </ToolStage>
      ) : null}
    </ToolFrame>
  );
}
