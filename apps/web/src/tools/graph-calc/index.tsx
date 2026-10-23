import {
  axisTicks,
  type FunctionSummary,
  formatNumber,
  MAX_FUNCTIONS,
  type SampledGraph,
  SERIES_STYLES,
  sampleGraph,
  summariseFunction,
  type Viewport,
  valueTable,
} from '@omnitool/tool-core';
import { DownloadIcon, PlusIcon, RotateCcwIcon, TrashIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadBlob } from '@/lib/download';
import { requireTool } from '@/lib/tool';

interface Series {
  readonly id: number;
  readonly source: string;
}

const DEFAULT_VIEW: Viewport = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };

/**
 * Columns across the graph, and the hard cap on evaluations per function.
 * Sampling 600 columns of six functions stays inside one animation frame; the
 * cap is what stops a pathological expression from stalling the page.
 */
const COLUMNS = 600;
const EVALUATION_BUDGET = 1500;

const ASPECT = 0.55;

function readColour(token: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value === '' ? '#101828' : value;
}

function zoomAbout(viewport: Viewport, factor: number, centreX: number, centreY: number): Viewport {
  return {
    xMin: centreX + (viewport.xMin - centreX) * factor,
    xMax: centreX + (viewport.xMax - centreX) * factor,
    yMin: centreY + (viewport.yMin - centreY) * factor,
    yMax: centreY + (viewport.yMax - centreY) * factor,
  };
}

export default function GraphCalculatorTool() {
  const tool = requireTool('graph-calc');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; viewport: Viewport } | null>(null);

  const [series, setSeries] = useState<readonly Series[]>([{ id: 1, source: '' }]);
  const [nextId, setNextId] = useState(2);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEW);
  const [sampled, setSampled] = useState<readonly SampledGraph[]>([]);
  const [traceX, setTraceX] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 640, height: 380 });

  const active = series.filter((entry) => entry.source.trim() !== '');

  // Sampling runs in an animation frame, after the keystroke has painted, so
  // typing never waits for a plot. The sources are read from `series` inside the
  // effect so that a new array identity cannot retrigger it on every render.
  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    frame = requestAnimationFrame(() => {
      if (cancelled) return;
      const next = series
        .filter((entry) => entry.source.trim() !== '')
        .map((entry) =>
          sampleGraph(entry.source, viewport, {
            width: COLUMNS,
            maxEvaluations: EVALUATION_BUDGET,
          }),
        );
      setSampled(next);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [series, viewport]);

  // The canvas fills its column and follows the panel height at a fixed ratio.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0) return;
      setSize({ width: Math.round(box.width), height: Math.round(box.width * ASPECT) });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const summaries = useMemo<readonly FunctionSummary[]>(
    () => active.map((entry, index) => summariseFunction(entry.source, sampled[index]?.gaps ?? 0)),
    [active, sampled],
  );

  const tableTicks = useMemo(() => axisTicks(viewport.xMin, viewport.xMax, 6), [viewport]);
  const tables = useMemo(
    () => active.map((entry) => valueTable(entry.source, tableTicks.values)),
    [active, tableTicks],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const surface = readColour('--surface');
    const gridColour = readColour('--border');
    const axisColour = readColour('--foreground');
    const muted = readColour('--muted-foreground');

    context.fillStyle = surface;
    context.fillRect(0, 0, size.width, size.height);

    const toX = (x: number): number =>
      ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * size.width;
    const toY = (y: number): number =>
      size.height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * size.height;

    const xTicks = axisTicks(viewport.xMin, viewport.xMax, 8);
    const yTicks = axisTicks(viewport.yMin, viewport.yMax, 6);

    context.lineWidth = 1;
    context.font = '12px ui-sans-serif, system-ui, sans-serif';
    context.fillStyle = muted;
    context.textAlign = 'center';
    context.textBaseline = 'top';

    for (const value of xTicks.values) {
      const x = toX(value);
      context.strokeStyle = value === 0 ? axisColour : gridColour;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size.height);
      context.stroke();
      if (value !== 0) {
        context.fillText(
          formatNumber(value, 4),
          x,
          Math.min(size.height - 16, Math.max(2, toY(0) + 4)),
        );
      }
    }

    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (const value of yTicks.values) {
      const y = toY(value);
      context.strokeStyle = value === 0 ? axisColour : gridColour;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size.width, y);
      context.stroke();
      if (value !== 0) {
        context.fillText(formatNumber(value, 4), Math.max(28, toX(0) - 6), y);
      }
    }

    // Curves.
    context.save();
    context.beginPath();
    context.rect(0, 0, size.width, size.height);
    context.clip();

    sampled.forEach((graph, index) => {
      const style = SERIES_STYLES[index];
      if (!style) return;
      context.strokeStyle = readColour(style.token);
      context.lineWidth = 2;
      context.setLineDash([...style.dash]);
      for (const segment of graph.segments) {
        context.beginPath();
        segment.points.forEach((point, pointIndex) => {
          const x = toX(point.x);
          const y = toY(point.y);
          if (pointIndex === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      }

      const last = graph.segments.at(-1)?.points.at(-1);
      if (last) {
        context.setLineDash([]);
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        const labelX = Math.min(size.width - 20, Math.max(4, toX(last.x) + 6));
        context.fillText(style.label, labelX, Math.min(size.height - 8, Math.max(8, toY(last.y))));
      }
    });
    context.setLineDash([]);

    if (traceX !== null && traceX >= viewport.xMin && traceX <= viewport.xMax) {
      const x = toX(traceX);
      context.strokeStyle = muted;
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size.height);
      context.stroke();
      context.setLineDash([]);

      sampled.forEach((graph, index) => {
        const style = SERIES_STYLES[index];
        if (!style) return;
        const compiled = graph.segments.flatMap((segment) => segment.points);
        const point = compiled.find((candidate) => Math.abs(candidate.x - traceX) < 1e-9);
        if (!point) return;
        context.fillStyle = readColour(style.token);
        context.beginPath();
        context.arc(toX(point.x), toY(point.y), 3, 0, Math.PI * 2);
        context.fill();
      });
    }

    context.restore();

    context.strokeStyle = gridColour;
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, size.width - 1, size.height - 1);
  }, [sampled, size, traceX, viewport]);

  useEffect(() => {
    draw();
  }, [draw]);

  // The tokens change with the theme class, so redraw when it does rather than
  // tracking the theme in every dependency list.
  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [draw]);

  // Wheel zoom must be non-passive to stop the page scrolling under the graph.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const centreX =
        viewport.xMin +
        ((event.clientX - rect.left) / rect.width) * (viewport.xMax - viewport.xMin);
      const centreY =
        viewport.yMax -
        ((event.clientY - rect.top) / rect.height) * (viewport.yMax - viewport.yMin);
      setViewport((current) => zoomAbout(current, event.deltaY > 0 ? 1.1 : 0.9, centreX, centreY));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [viewport]);

  function updateSource(id: number, source: string) {
    setSeries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, source } : entry)),
    );
  }

  function addSeries() {
    if (series.length >= MAX_FUNCTIONS) return;
    setSeries((current) => [...current, { id: nextId, source: '' }]);
    setNextId((id) => id + 1);
  }

  function removeSeries(id: number) {
    setSeries((current) => {
      const remaining = current.filter((entry) => entry.id !== id);
      return remaining.length === 0 ? [{ id: nextId, source: '' }] : remaining;
    });
    setNextId((id) => id + 1);
    setTraceX(null);
  }

  function reset() {
    setSeries([{ id: nextId, source: '' }]);
    setNextId((id) => id + 1);
    setViewport(DEFAULT_VIEW);
    setTraceX(null);
  }

  function pan(dx: number, dy: number) {
    const width = viewport.xMax - viewport.xMin;
    const height = viewport.yMax - viewport.yMin;
    setViewport((current) => ({
      xMin: current.xMin + dx * width,
      xMax: current.xMax + dx * width,
      yMin: current.yMin + dy * height,
      yMax: current.yMax + dy * height,
    }));
  }

  function zoom(factor: number) {
    setViewport((current) =>
      zoomAbout(
        current,
        factor,
        (current.xMin + current.xMax) / 2,
        (current.yMin + current.yMax) / 2,
      ),
    );
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? 0.25 : 0.1;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (traceX !== null) setTraceX((x) => (x ?? 0) - (viewport.xMax - viewport.xMin) * 0.01);
        else pan(-step, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (traceX !== null) setTraceX((x) => (x ?? 0) + (viewport.xMax - viewport.xMin) * 0.01);
        else pan(step, 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (traceX === null) pan(0, step);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (traceX === null) pan(0, -step);
        break;
      case '+':
      case '=':
        event.preventDefault();
        zoom(0.8);
        break;
      case '-':
        event.preventDefault();
        zoom(1.25);
        break;
      case 't':
      case 'T':
        event.preventDefault();
        setTraceX((current) => (current === null ? 0 : null));
        break;
      case 'Escape':
        setTraceX(null);
        break;
      default:
        break;
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinchDistance.current =
        first && second ? Math.hypot(first.x - second.x, first.y - second.y) : null;
      dragOrigin.current = { x: event.clientX, y: event.clientY, viewport };
    } else {
      dragOrigin.current = { x: event.clientX, y: event.clientY, viewport };
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const pointer = pointers.current.get(event.pointerId);

    if (pointers.current.size === 2 && pinchDistance.current !== null) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [first, second] = [...pointers.current.values()];
      if (!first || !second) return;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const factor = distance === 0 ? 1 : pinchDistance.current / distance;
      pinchDistance.current = distance;
      const centreX =
        viewport.xMin +
        (((first.x + second.x) / 2 - rect.left) / rect.width) * (viewport.xMax - viewport.xMin);
      const centreY =
        viewport.yMax -
        (((first.y + second.y) / 2 - rect.top) / rect.height) * (viewport.yMax - viewport.yMin);
      setViewport((current) =>
        zoomAbout(current, Math.min(2, Math.max(0.5, factor)), centreX, centreY),
      );
      return;
    }

    if (pointer && dragOrigin.current && traceX === null) {
      const origin = dragOrigin.current;
      const dx = (event.clientX - origin.x) / rect.width;
      const dy = (event.clientY - origin.y) / rect.height;
      const width = origin.viewport.xMax - origin.viewport.xMin;
      const height = origin.viewport.yMax - origin.viewport.yMin;
      setViewport({
        xMin: origin.viewport.xMin - dx * width,
        xMax: origin.viewport.xMax - dx * width,
        yMin: origin.viewport.yMin + dy * height,
        yMax: origin.viewport.yMax + dy * height,
      });
      return;
    }

    if (traceX !== null) {
      const x =
        viewport.xMin +
        ((event.clientX - rect.left) / rect.width) * (viewport.xMax - viewport.xMin);
      setTraceX(Math.min(viewport.xMax, Math.max(viewport.xMin, x)));
    }
  }

  function endPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
    dragOrigin.current = pointers.current.size === 0 ? null : dragOrigin.current;
  }

  function exportPng() {
    canvasRef.current?.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'graph.png');
    }, 'image/png');
  }

  const traceValue = useMemo(() => {
    if (traceX === null) return null;
    return sampled.map((graph, index) => {
      const point = graph.segments
        .flatMap((segment) => segment.points)
        .find((candidate) => Math.abs(candidate.x - traceX) < 1e-9);
      return {
        label: SERIES_STYLES[index]?.label ?? `f${index + 1}`,
        token: SERIES_STYLES[index]?.token ?? '--foreground',
        source: active[index]?.source ?? '',
        y: point ? formatNumber(point.y, 6) : null,
      };
    });
  }, [active, sampled, traceX]);

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Functions">
        <div className="space-y-3">
          {series.map((entry, index) => {
            const style = SERIES_STYLES[index];
            return (
              <div key={entry.id} className="grid gap-2 sm:grid-cols-[6rem_1fr_auto] sm:items-end">
                <span className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="inline-block h-0.5 w-6 rounded-pill"
                    style={{ backgroundColor: `var(${style?.token ?? '--foreground'})` }}
                  />
                  {style?.label ?? `f${index + 1}`}
                </span>
                <div>
                  <Label htmlFor={`graph-expression-${entry.id}`}>{`Function ${index + 1}`}</Label>
                  <Input
                    id={`graph-expression-${entry.id}`}
                    className="mt-1 font-mono"
                    value={entry.source}
                    placeholder={index === 0 ? 'sin(x)' : 'x^2 - 1'}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => updateSource(entry.id, event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove function ${index + 1}`}
                  disabled={series.length === 1}
                  onClick={() => removeSeries(entry.id)}
                >
                  <TrashIcon aria-hidden="true" className="size-4" />
                </Button>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addSeries}
              disabled={series.length >= MAX_FUNCTIONS}
            >
              <PlusIcon aria-hidden="true" className="size-4" />
              Add function
            </Button>
            <Button type="button" variant="outline" onClick={() => zoom(0.8)}>
              Zoom in
            </Button>
            <Button type="button" variant="outline" onClick={() => zoom(1.25)}>
              Zoom out
            </Button>
            <Button type="button" variant="outline" onClick={() => setViewport(DEFAULT_VIEW)}>
              <RotateCcwIcon aria-hidden="true" className="size-4" />
              Reset view
            </Button>
            <Button
              type="button"
              variant={traceX === null ? 'outline' : 'secondary'}
              aria-pressed={traceX !== null}
              onClick={() => setTraceX((current) => (current === null ? 0 : null))}
            >
              Trace
            </Button>
          </div>
          {series.some((entry) => entry.source.trim() !== '') ? (
            <ul className="space-y-1 text-sm" aria-live="polite">
              {series
                .filter((entry) => entry.source.trim() !== '')
                .map((entry, index) => {
                  const graph = sampled[index];
                  if (!graph) return null;
                  return (
                    <li key={entry.id} className={graph.error ? 'text-destructive' : undefined}>
                      {graph.error
                        ? `${SERIES_STYLES[index]?.label}: ${graph.error}`
                        : `${SERIES_STYLES[index]?.label}: ${graph.complete ? 'plotted' : 'plotted as far as the evaluation cap allowed'}`}
                    </li>
                  );
                })}
            </ul>
          ) : null}
          <ToolHint>
            Angles are in radians. Type x as the variable and use *, /, ^, brackets and the usual
            functions. Each function gets a colour, a dash pattern and a label, so the curves are
            still distinct without colour. Drag to pan, scroll or pinch to zoom, and press T to
            trace: the left and right arrow keys move the cursor.
          </ToolHint>
        </div>
      </ToolStage>

      <ToolStage
        title="Graph"
        actions={
          <Button type="button" variant="ghost" onClick={exportPng}>
            <DownloadIcon aria-hidden="true" className="size-4" />
            Export PNG
          </Button>
        }
      >
        <div
          ref={wrapperRef}
          className="rounded-control border border-border focus-within:ring-3 focus-within:ring-ring/50"
        >
          <canvas
            ref={canvasRef}
            // The canvas is the widget: it takes focus, responds to arrows and
            // plus/minus, and describes itself from the summary below. The text
            // alternative is the Values stage.
            tabIndex={0}
            aria-label="Graph of your functions. Arrow keys pan, plus and minus zoom, T starts tracing."
            aria-describedby="graph-description"
            className="block w-full touch-none select-none rounded-control outline-none"
            style={{ height: `${size.height}px` }}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          />
        </div>
        <p id="graph-description" className="mt-2 text-sm text-muted-foreground">
          The graph is drawn from samples across the visible range. Where a function is not a real
          number, or jumps past the top or bottom of the view, the line stops instead of joining the
          two sides. The same information is in the values and descriptions below.
        </p>
        {traceX !== null && traceValue ? (
          <div className="mt-3 rounded-control border border-border bg-surface-inset p-3">
            <p className="text-sm font-medium">{`Tracing at x = ${formatNumber(traceX, 6)}`}</p>
            <ul className="mt-1 space-y-1 text-sm">
              {traceValue.map((row, index) => (
                <li key={row.label} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-0.5 w-6 rounded-pill"
                    style={{
                      backgroundColor: `var(${SERIES_STYLES[index]?.token ?? '--foreground'})`,
                    }}
                  />
                  <span className="font-mono">{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.y === null ? 'not defined here' : row.y}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ToolStage>

      <ToolStage title="Values">
        {series.every((entry) => entry.source.trim() === '') ? (
          <p className="text-sm text-muted-foreground">
            Type a function to see a table of values and a description of its curve.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Values of each function at the tick positions</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      x
                    </th>
                    {active.map((entry, index) => (
                      <th scope="col" key={entry.id} className="py-2 pr-4 font-mono font-medium">
                        {`f${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableTicks.values.map((x, row) => (
                    <tr key={x} className="border-b border-border last:border-b-0">
                      <th scope="row" className="py-2 pr-4 text-left font-mono font-normal">
                        {formatNumber(x, 6)}
                      </th>
                      {tables.map((table, index) => (
                        <td key={active[index]?.id ?? index} className="py-2 pr-4 font-mono">
                          {table.rows[row]?.y === null || table.rows[row]?.y === undefined
                            ? 'undefined'
                            : formatNumber(table.rows[row]?.y as number, 6)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3">
              {summaries.map((summary, index) => (
                <li key={active[index]?.id ?? index}>
                  <p className="font-mono text-sm">{`f${index + 1}: y = ${summary.source}`}</p>
                  <p className="text-sm text-muted-foreground">{summary.note}</p>
                  {summary.keyPoints.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {summary.keyPoints
                        .map(
                          (point) =>
                            `f(${formatNumber(point.x, 6)}) = ${point.y === null ? 'undefined' : formatNumber(point.y, 6)}`,
                        )
                        .join('; ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
