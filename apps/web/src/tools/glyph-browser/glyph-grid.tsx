import { characterOf, formatCodePoint } from '@omnitool/tool-core';
import {
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  CELL,
  cellPosition,
  columnsFor,
  moveActive,
  ROW,
  VIEWPORT,
  windowFor,
} from './grid-geometry';

export type Entry = readonly [codePoint: number, name: string, category: string];

interface GlyphGridProps {
  readonly entries: readonly Entry[];
  readonly label: string;
  readonly selectedCodePoint: number | null;
  readonly onSelect: (entry: Entry) => void;
}

/** Characters the browser can draw: no controls, formats, surrogates or line breaks. */
function isPrintable(codePoint: number, category: string): boolean {
  if (
    category === 'Cc' ||
    category === 'Cf' ||
    category === 'Cs' ||
    category === 'Zl' ||
    category === 'Zp'
  ) {
    return false;
  }
  return characterOf(codePoint) !== '';
}

function hex(codePoint: number): string {
  return codePoint.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * The character grid, windowed to the rows in view.
 *
 * One option per character, `role="listbox"` over them, and a roving tabindex:
 * Tab lands on the active character, arrows move it, Home/End jump to the ends
 * and PageUp/PageDown move by a screen. Only the rendered window is in the DOM,
 * so `aria-setsize` and `aria-posinset` carry the real position and count, and
 * the options that are scrolled out of view are simply not there — the pattern
 * screen readers expect for a virtual list.
 *
 * Scrolling is instant (no `behavior: 'smooth'`), so it needs no
 * prefers-reduced-motion branch and a keyboard move never animates.
 */
export function GlyphGrid({ entries, label, selectedCodePoint, onSelect }: GlyphGridProps) {
  const portRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [active, setActive] = useState(0);
  const focusActive = useRef(false);

  const columns = columnsFor(size.width);
  const { rows, first, last } = windowFor(
    entries.length,
    columns,
    scrollTop,
    size.height > 0 ? size.height : VIEWPORT,
  );

  useEffect(() => {
    const port = portRef.current;
    if (!port) return;
    setSize({ width: port.clientWidth, height: port.clientHeight });
    const observer = new ResizeObserver((records) => {
      const record = records[0];
      if (record) setSize({ width: record.contentRect.width, height: record.contentRect.height });
    });
    observer.observe(port);
    return () => observer.disconnect();
  }, []);

  // After a keyboard move the target may have just entered the window, so focus
  // is applied after the DOM update rather than in the key handler.
  useLayoutEffect(() => {
    if (!focusActive.current) return;
    const target = portRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!target) return;
    focusActive.current = false;
    target.focus({ preventScroll: true });
  }, [active]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const entry = entries[active];
        if (!entry) return;
        event.preventDefault();
        onSelect(entry);
        return;
      }
      const next = moveActive(active, event.key, entries.length, columns);
      if (next === null) return;
      event.preventDefault();
      focusActive.current = true;
      setActive(next);
      const port = portRef.current;
      if (!port) return;
      const { top } = cellPosition(next, columns);
      if (top < port.scrollTop) port.scrollTop = top;
      else if (top + ROW > port.scrollTop + port.clientHeight) {
        port.scrollTop = top + ROW - port.clientHeight;
      }
      setScrollTop(port.scrollTop);
    },
    [active, columns, entries, onSelect],
  );

  const onFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const index = Number((event.target as HTMLElement).dataset.index);
    if (Number.isInteger(index) && index >= 0) setActive(index);
  }, []);

  return (
    <div
      ref={portRef}
      role="listbox"
      aria-label={label}
      className="min-h-0 flex-1 overflow-y-auto"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      onFocus={onFocus}
    >
      <div className="relative" style={{ height: rows * ROW }}>
        {Array.from({ length: Math.max(0, last - first + 1) }, (_, offset) => {
          const index = first + offset;
          const entry = entries[index];
          if (!entry) return null;
          const [codePoint, name, category] = entry;
          const character = characterOf(codePoint);
          const printable = isPrintable(codePoint, category);
          const { top, left } = cellPosition(index, columns);
          return (
            <div
              key={codePoint}
              role="option"
              data-index={index}
              tabIndex={index === active ? 0 : -1}
              aria-selected={selectedCodePoint === codePoint}
              aria-posinset={index + 1}
              aria-setsize={entries.length}
              aria-label={`${printable ? character : hex(codePoint)} ${name}, ${formatCodePoint(codePoint)}`}
              onClick={() => {
                setActive(index);
                onSelect(entry);
              }}
              onKeyDown={onKeyDown}
              className="absolute flex cursor-pointer items-center justify-center rounded-control border border-border bg-surface text-lg hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:border-ring aria-selected:bg-surface-inset"
              style={{ top, left, width: CELL, height: CELL }}
            >
              {printable ? (
                <span aria-hidden="true">{character}</span>
              ) : (
                <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
                  {hex(codePoint)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
