import type { Tool } from '@omnitool/tools-registry';
import { CheckIcon, Share2Icon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { copyText } from '@/lib/download';
import { Button } from './ui/button';

export function ToolFrame({
  tool,
  children,
  aside,
}: {
  readonly tool: Tool;
  readonly children: ReactNode;
  readonly aside?: ReactNode;
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
    <article className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl">{tool.name}</h1>
          {tool.description ? (
            <p className="prose-measure mt-2 text-muted-foreground">{tool.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={share} aria-live="polite">
            {status === 'copied' ? (
              <CheckIcon aria-hidden="true" className="size-4" />
            ) : (
              <Share2Icon aria-hidden="true" className="size-4" />
            )}
            {status === 'copied' ? 'Link copied' : status === 'failed' ? 'Copy failed' : 'Share'}
          </Button>
        </div>
      </header>
      {aside}
      {children}
    </article>
  );
}

export function ToolStage({
  title,
  children,
  className,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`border-t border-border py-5 first:border-t-0 ${className ?? ''}`}
    >
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
