import { dimensions, PAPER_SERIES, type PaperSize, paperSizeTable } from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
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

interface Row {
  readonly size: PaperSize;
  readonly mm: string;
  readonly inches: string;
  readonly points: string;
  readonly px72: string;
  readonly px96: string;
  readonly px300: string;
}

function format(pair: { width: number; height: number }, unit: string): string {
  return `${pair.width} × ${pair.height}${unit}`;
}

export default function PaperSizesTool() {
  const tool = requireTool('paper-sizes');
  const [series, setSeries] = useState('A');

  const rows = useMemo<Row[]>(() => {
    const sizes =
      series === 'all'
        ? PAPER_SERIES.flatMap((entry) => paperSizeTable(entry.id))
        : paperSizeTable(series);
    return sizes.map((size) => {
      const value = dimensions(size.id);
      return {
        size,
        mm: format(value.mm, ' mm'),
        inches: format(value.inches, ' in'),
        points: format(value.points, ' pt'),
        px72: format(value.px72, ' px'),
        px96: format(value.px96, ' px'),
        px300: format(value.px300, ' px'),
      };
    });
  }, [series]);

  const tableText = [
    'Size\tMillimetres\tInches\tPoints\tPixels at 72 dpi\tPixels at 96 dpi\tPixels at 300 dpi',
    ...rows.map((row) =>
      [row.size.name, row.mm, row.inches, row.points, row.px72, row.px96, row.px300].join('\t'),
    ),
  ].join('\n');

  function reset() {
    setSeries('A');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={tableText} filename="paper-sizes.txt" disabled={rows.length === 0} />
      }
    >
      <ToolStage title="Series">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="paper-series">Paper series</Label>
          <Select value={series} onValueChange={setSeries}>
            <SelectTrigger id="paper-series" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAPER_SERIES.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.name}
                </SelectItem>
              ))}
              <SelectItem value="all">All sizes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToolHint className="mt-4">
          ISO 216 sizes share one aspect ratio of 1:√2, so folding or halving a sheet gives the next
          size down. C series envelopes are sized to hold the matching A sheet.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Dimensions">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Paper sizes in millimetres, inches, points and pixels at 72, 96 and 300 dpi
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Size
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Millimetres
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Inches
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Points
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  72 dpi
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  96 dpi
                </th>
                <th scope="col" className="py-2 font-medium">
                  300 dpi
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.size.id} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                    {row.size.name}
                  </th>
                  <td className="py-1.5 pr-4 font-mono">{row.mm}</td>
                  <td className="py-1.5 pr-4 font-mono">{row.inches}</td>
                  <td className="py-1.5 pr-4 font-mono">{row.points}</td>
                  <td className="py-1.5 pr-4 font-mono">{row.px72}</td>
                  <td className="py-1.5 pr-4 font-mono">{row.px96}</td>
                  <td className="py-1.5 font-mono">{row.px300}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ToolHint className="mt-4">
          Points here are PostScript points, 1/72 inch, which is also the pixel grid of a PDF at 72
          dpi. CSS treats one pixel as 1/96 inch; 300 dpi is the usual print resolution. Values are
          rounded to three decimal places.
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
