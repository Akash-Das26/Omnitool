import {
  DEFAULT_ROOT_FONT_SIZE,
  TYPE_SCALE_PRESETS,
  TypeScaleError,
  typeScale,
  typeScaleCss,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
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

const DEFAULT_PRESET = TYPE_SCALE_PRESETS.find((preset) => preset.id === 'major-third');

export default function TypoCalcTool() {
  const tool = requireTool('typo-calc');
  const [presetId, setPresetId] = useState(DEFAULT_PRESET?.id ?? 'custom');
  const [ratio, setRatio] = useState(String(DEFAULT_PRESET?.ratio ?? 1.25));
  const [basePx, setBasePx] = useState('16');
  const [root, setRoot] = useState(String(DEFAULT_ROOT_FONT_SIZE));
  const [stepsDown, setStepsDown] = useState('2');
  const [stepsUp, setStepsUp] = useState('6');

  const scale = useMemo(() => {
    try {
      return {
        steps: typeScale({
          basePx: Number(basePx),
          ratio: Number(ratio),
          stepsDown: Number(stepsDown),
          stepsUp: Number(stepsUp),
          root: Number(root),
        }),
        error: null as string | null,
      };
    } catch (cause) {
      return {
        steps: [],
        error:
          cause instanceof TypeScaleError ? cause.message : 'That scale could not be calculated',
      };
    }
  }, [basePx, ratio, stepsDown, stepsUp, root]);

  const css = scale.steps.length > 0 ? typeScaleCss(scale.steps) : '';

  function selectPreset(nextId: string) {
    setPresetId(nextId);
    const preset = TYPE_SCALE_PRESETS.find((entry) => entry.id === nextId);
    if (preset) setRatio(String(preset.ratio));
  }

  function reset() {
    setPresetId(DEFAULT_PRESET?.id ?? 'custom');
    setRatio(String(DEFAULT_PRESET?.ratio ?? 1.25));
    setBasePx('16');
    setRoot(String(DEFAULT_ROOT_FONT_SIZE));
    setStepsDown('2');
    setStepsUp('6');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={css} filename="type-scale.css" mime="text/css" disabled={css === ''} />
      }
    >
      <ToolStage title="Scale">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type-preset">Scale preset</Label>
            <Select value={presetId} onValueChange={selectPreset}>
              <SelectTrigger id="type-preset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_SCALE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name} ({preset.ratio})
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom ratio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-ratio">Ratio</Label>
            <Input
              id="type-ratio"
              type="number"
              min={1.01}
              step="0.001"
              value={ratio}
              onChange={(event) => {
                setRatio(event.target.value);
                setPresetId('custom');
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-base">Base size in pixels</Label>
            <Input
              id="type-base"
              type="number"
              min={1}
              step="0.5"
              value={basePx}
              onChange={(event) => setBasePx(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-root">Root font size in pixels</Label>
            <Input
              id="type-root"
              type="number"
              min={1}
              step="0.5"
              value={root}
              onChange={(event) => setRoot(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-down">Steps below the base</Label>
            <Input
              id="type-down"
              type="number"
              min={0}
              max={16}
              value={stepsDown}
              onChange={(event) => setStepsDown(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-up">Steps above the base</Label>
            <Input
              id="type-up"
              type="number"
              min={0}
              max={16}
              value={stepsUp}
              onChange={(event) => setStepsUp(event.target.value)}
            />
          </div>
        </div>

        {scale.error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {scale.error}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-muted-foreground">
          A modular scale multiplies one base size by a fixed ratio, so every size relates to the
          others. A small ratio such as 1.125 suits dense interfaces; 1.25 to 1.333 gives headings
          more contrast.
        </p>
      </ToolStage>

      <ToolStage title="Sizes">
        {scale.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Enter a valid scale to see the sizes.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full max-w-xl border-collapse text-sm">
                <caption className="sr-only">Type scale steps in pixels and rem</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="py-2 pr-6 font-medium">
                      Step
                    </th>
                    <th scope="col" className="py-2 pr-6 font-medium">
                      Pixels
                    </th>
                    <th scope="col" className="py-2 pr-6 font-medium">
                      Rem
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Custom property
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scale.steps.map((step) => (
                    <tr key={step.step} className="border-b border-border/60">
                      <td className="py-1.5 pr-6 font-mono">
                        {step.step > 0 ? `+${step.step}` : step.step}
                      </td>
                      <td className="py-1.5 pr-6 font-mono">{step.px}px</td>
                      <td className="py-1.5 pr-6 font-mono">{step.rem}rem</td>
                      <td className="py-1.5 font-mono text-muted-foreground">
                        {step.customProperty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <pre className="mt-4 overflow-x-auto rounded-panel border border-border bg-surface-inset p-3 font-mono text-sm">
              <code>{css}</code>
            </pre>
          </>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
