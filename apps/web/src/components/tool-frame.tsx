import type { Tool } from '@omnitool/tools-registry';
import { CheckIcon, Share2Icon } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { copyText } from '@/lib/download';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

/**
 * Tool page frame: name, Share, Reset, then the stages separated by 1 px rules.
 * Stage headings are unnumbered; numbers belong to workflow steps only
 * (DESIGN.md, Components).
 */
export function ToolFrame({
  tool,
  children,
  actions,
  onReset,
}: {
  readonly tool: Tool;
  readonly children: ReactNode;
  /** Output actions (Copy all, Download). One node: inline on desktop, sticky on mobile. */
  readonly actions?: ReactNode;
  readonly onReset?: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function share() {
    try {
      await copyText(window.location.href);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <article className="mx-auto w-full max-w-[1100px] px-4 py-6 pb-24 md:px-8 md:pb-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl">{tool.name}</h1>
          {tool.description ? (
            <p className="prose-measure mt-2 text-muted-foreground">{tool.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={share} aria-live="polite">
            {status === 'copied' ? (
              <CheckIcon aria-hidden="true" className="size-4" />
            ) : (
              <Share2Icon aria-hidden="true" className="size-4" />
            )}
            {status === 'copied' ? 'Link copied' : status === 'failed' ? 'Copy failed' : 'Share'}
          </Button>
          {onReset ? (
            <Button type="button" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>
      </header>

      <div className="overflow-hidden rounded-panel border border-border bg-surface">
        {children}
        {actions ? (
          <div
            data-slot="tool-actions"
            className="flex flex-wrap gap-2 border-t border-border bg-surface p-3 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4"
          >
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ToolStage({
  title,
  children,
  actions,
  className,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn('border-t border-border first:border-t-0', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-inset px-4 py-2">
        <h2 id={headingId} className="text-sm font-medium">
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
