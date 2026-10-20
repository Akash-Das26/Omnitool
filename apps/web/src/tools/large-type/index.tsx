import { fitFontSize, MAX_FONT_SIZE, MIN_FONT_SIZE, prepareDisplay } from '@omnitool/tool-core';
import { useMemo, useRef, useState } from 'react';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';

const DEFAULT_TEXT = 'Large Type\nHold the room without a slide deck.';

export default function LargeTypeTool() {
  const tool = requireTool('large-type');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [size, setSize] = useState(96);
  const [presenting, setPresenting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const plan = useMemo(() => prepareDisplay(text), [text]);
  const suggested = useMemo(() => fitFontSize(plan, { width: 960, height: 540 }), [plan]);

  function reset() {
    setText(DEFAULT_TEXT);
    setSize(96);
    setNotice(null);
  }

  async function present() {
    const node = previewRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setPresenting(false);
        return;
      }
      await node.requestFullscreen();
      setPresenting(true);
      setNotice(null);
    } catch {
      setNotice('This browser would not open the full-screen view. The preview below still works.');
    }
  }

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Text">
        <Label htmlFor="large-type-input">Text to show</Label>
        <TextArea
          id="large-type-input"
          className="mt-2 font-sans"
          rows={4}
          value={text}
          placeholder="Type or paste a line or two"
          onChange={(event) => setText(event.target.value)}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-2">
            <Label htmlFor="large-type-size">Size in px</Label>
            <Input
              id="large-type-size"
              type="number"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              value={size}
              onChange={(event) =>
                setSize(
                  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(event.target.value) || 0)),
                )
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSize(suggested)}>
              Fit to the preview
            </Button>
            <Button type="button" onClick={present}>
              {presenting ? 'Exit full screen' : 'Present'}
            </Button>
          </div>
        </div>
        {notice ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {notice}
          </p>
        ) : null}
        <ToolHint>
          The text is prepared line by line: extra spaces collapse and blank lines at the start and
          end are dropped. “Fit to the preview” estimates a size from the longest line and the line
          count; the size box overrides it.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Display">
        <div
          ref={previewRef}
          className="flex min-h-64 flex-col justify-center overflow-auto rounded-control border border-border bg-background p-4"
        >
          {plan.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing to show yet. Type a line in the field above.
            </p>
          ) : (
            plan.lines.map((line, index) => (
              <span
                // Lines are positional and never reordered.
                // biome-ignore lint/suspicious/noArrayIndexKey: line order is the identity here
                key={index}
                className="block font-bold leading-[1.15] tracking-[-0.02em] break-words"
                style={{ fontSize: `${size}px` }}
              >
                {line === '' ? '\u00a0' : line}
              </span>
            ))
          )}
        </div>
      </ToolStage>
    </ToolFrame>
  );
}
