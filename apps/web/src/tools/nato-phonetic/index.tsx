import { spellOut } from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';

export default function NatoPhoneticTool() {
  const tool = requireTool('nato-phonetic');
  const [text, setText] = useState('');

  const result = useMemo(() => spellOut(text), [text]);

  const summary = result.text;

  function reset() {
    setText('');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={summary} filename="spelled-out.txt" disabled={summary === ''} />
      }
    >
      <ToolStage title="Text">
        <Label htmlFor="nato-input">Text to spell out</Label>
        <TextArea
          id="nato-input"
          className="mt-2"
          rows={8}
          value={text}
          placeholder="Type or paste letters and digits; the spelling appears as you go."
          onChange={(event) => setText(event.target.value)}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          The ICAO spelling alphabet, the one NATO and civil aviation use. Letters are spelled with
          their words (Alfa, Bravo, Charlie…); digits use the ICAO pronunciation (Wun, Too, Tree,
          Fower, Fife). Words in the output are separated by a slash.
        </p>
      </ToolStage>

      <ToolStage title="Spelled out">
        {result.flagged.length > 0 ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            No ICAO word for: {result.flagged.join(', ')}. They were passed through unchanged.
          </p>
        ) : null}
        <Label htmlFor="nato-output">Spelled-out text</Label>
        <TextArea id="nato-output" className="mt-2" rows={8} readOnly value={result.text} />
      </ToolStage>
    </ToolFrame>
  );
}
