import {
  generatePassphrase,
  generatePassword,
  PasswordError,
  type PasswordOptions,
  passphraseEntropyBits,
  passwordEntropyBits,
} from '@omnitool/tool-core';
import { RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';
import { OutputActions } from '@/components/output-actions';
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
import { requireTool } from '@/lib/tool';

type Mode = 'password' | 'passphrase';

export default function PasswordGennyTool() {
  const tool = requireTool('password-genny');
  const [mode, setMode] = useState<Mode>('password');
  const [options, setOptions] = useState<PasswordOptions>({
    length: 20,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: true,
  });
  const [words, setWords] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [capitalise, setCapitalise] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function generate() {
    try {
      setValue(
        mode === 'password'
          ? generatePassword(options)
          : generatePassphrase({ words, separator, capitalise }),
      );
      setError(null);
    } catch (cause) {
      setValue('');
      setError(
        cause instanceof PasswordError ? cause.message : 'The browser could not make a password',
      );
    }
  }

  function toggle(key: keyof Omit<PasswordOptions, 'length'>) {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  }

  const entropy = mode === 'password' ? passwordEntropyBits(options) : passphraseEntropyBits(words);

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Kind">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="password-mode">Generate</Label>
            <Select
              value={mode}
              onValueChange={(next) => {
                setMode(next as Mode);
                setValue('');
                setError(null);
              }}
            >
              <SelectTrigger id="password-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="password">Random password</SelectItem>
                <SelectItem value="passphrase">Word passphrase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ToolStage>

        <ToolStage title="Options">
          {mode === 'password' ? (
            <>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="password-length">Length: {options.length} characters</Label>
                <Input
                  id="password-length"
                  type="number"
                  min={4}
                  max={256}
                  value={options.length}
                  onChange={(event) =>
                    setOptions((current) => ({ ...current, length: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {(
                  [
                    ['lowercase', 'Lower case'],
                    ['uppercase', 'Upper case'],
                    ['digits', 'Digits'],
                    ['symbols', 'Symbols'],
                    ['excludeAmbiguous', 'Avoid look-alikes (0/O, 1/l/I)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={() => toggle(key)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="passphrase-words">Words</Label>
                <Input
                  id="passphrase-words"
                  type="number"
                  min={2}
                  max={12}
                  value={words}
                  onChange={(event) => setWords(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passphrase-separator">Separator</Label>
                <Input
                  id="passphrase-separator"
                  value={separator}
                  maxLength={3}
                  onChange={(event) => setSeparator(event.target.value)}
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 self-end text-sm">
                <input
                  type="checkbox"
                  checked={capitalise}
                  onChange={(event) => setCapitalise(event.target.checked)}
                  className="size-5 accent-[var(--primary)]"
                />
                Capitalise words
              </label>
            </div>
          )}

          <div className="mt-4">
            <Button type="button" onClick={generate}>
              <RefreshCwIcon aria-hidden="true" className="size-4" />
              Generate
            </Button>
          </div>
        </ToolStage>

        <ToolStage title="Output">
          {error ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Label htmlFor="password-output">Generated {mode}</Label>
          <Input
            id="password-output"
            className="mt-2 font-mono text-base"
            readOnly
            value={value}
            placeholder="Choose Generate to make a value."
          />
          <p className="mt-2 text-sm text-muted-foreground">
            About {entropy} bits of entropy. Generated with the browser's cryptographic random
            source; nothing is stored, logged or sent.
          </p>
          <div className="mt-3">
            <OutputActions
              text={value}
              filename={mode === 'password' ? 'password.txt' : 'passphrase.txt'}
              disabled={value === ''}
            />
          </div>
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
