import { brailleToText, textToBraille } from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';

type Mode = 'encode' | 'decode';

export default function BrailleConverterTool() {
  const tool = requireTool('braille-converter');
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');

  const result = useMemo(
    () => (mode === 'encode' ? textToBraille(input) : brailleToText(input)),
    [input, mode],
  );

  function reset() {
    setMode('encode');
    setInput('');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={result.text}
          filename={mode === 'encode' ? 'braille.txt' : 'decoded-text.txt'}
          disabled={result.text === ''}
        />
      }
    >
      <ToolStage title={mode === 'encode' ? 'Text' : 'Braille'}>
        <div className="max-w-xs">
          <Label htmlFor="braille-mode">Direction</Label>
          <Select
            value={mode}
            onValueChange={(next) => {
              setMode(next as Mode);
              setInput('');
            }}
          >
            <SelectTrigger id="braille-mode" className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="encode">Text to braille</SelectItem>
              <SelectItem value="decode">Braille to text</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4">
          <Label htmlFor="braille-input">
            {mode === 'encode' ? 'Text to convert' : 'Braille cells to convert'}
          </Label>
          <TextArea
            id="braille-input"
            className="mt-2"
            rows={8}
            value={input}
            spellCheck={false}
            placeholder={mode === 'encode' ? 'Type or paste text' : 'Paste braille cells'}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
        <ToolHint>
          English grade 1 (uncontracted) braille in Unicode braille patterns: letters, the number
          sign, the capital sign and basic punctuation, following Unified English Braille.
          Contracted braille (grade 2) is not supported.
        </ToolHint>
      </ToolStage>

      <ToolStage title={mode === 'encode' ? 'Braille' : 'Text'}>
        {result.unknown.length > 0 && mode === 'encode' ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            No braille sign for: {result.unknown.join(', ')}. They were left out.
          </p>
        ) : null}
        {result.unknown.length > 0 && mode === 'decode' ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            Cells outside English grade 1: {result.unknown.join(', ')}. They show as question marks.
          </p>
        ) : null}
        <Label htmlFor="braille-output">{mode === 'encode' ? 'Braille cells' : 'Text'}</Label>
        <TextArea
          id="braille-output"
          className="mt-2 font-mono"
          rows={8}
          readOnly
          value={result.text}
        />
      </ToolStage>
    </ToolFrame>
  );
}
