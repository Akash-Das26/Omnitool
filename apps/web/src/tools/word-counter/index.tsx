import { countText } from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';

function minutes(value: number): string {
  if (value === 0) return '—';
  return value === 1 ? '1 min' : `${value} min`;
}

export default function WordCounterTool() {
  const tool = requireTool('word-counter');
  const [text, setText] = useState('');
  const stats = useMemo(() => countText(text), [text]);

  const summary = [
    `Words: ${stats.words}`,
    `Sentences: ${stats.sentences}`,
    `Characters: ${stats.characters}`,
    `Characters without spaces: ${stats.charactersNoSpaces}`,
    `Paragraphs: ${stats.paragraphs}`,
    `Lines: ${stats.lines}`,
    `Reading time: ${minutes(stats.readingMinutes)}`,
    `Speaking time: ${minutes(stats.speakingMinutes)}`,
  ].join('\n');

  const cards = [
    ['Words', stats.words],
    ['Sentences', stats.sentences],
    ['Characters', stats.characters],
    ['Without spaces', stats.charactersNoSpaces],
    ['Paragraphs', stats.paragraphs],
    ['Lines', stats.lines],
    ['Reading time', minutes(stats.readingMinutes)],
    ['Speaking time', minutes(stats.speakingMinutes)],
  ] as const;

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Text">
          <Label htmlFor="word-counter-input">Text to count</Label>
          <TextArea
            id="word-counter-input"
            className="mt-2 font-sans"
            rows={14}
            value={text}
            placeholder="Type or paste text; the counts update as you go."
            onChange={(event) => setText(event.target.value)}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Words and sentences use the browser's text segmentation for en-GB, so numbers,
            contractions and punctuation are counted sensibly. Reading time assumes 200 words a
            minute; speaking time 130.
          </p>
        </ToolStage>

        <ToolStage title="Counts">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cards.map(([label, value]) => (
              <div key={label} className="rounded-control border border-border bg-background p-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-mono text-xl">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <OutputActions text={summary} filename="word-count.txt" disabled={text === ''} />
          </div>
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
