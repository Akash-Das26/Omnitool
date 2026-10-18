import { CheckIcon, CopyIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { copyText } from '@/lib/download';
import { cn } from '@/lib/utils';

/**
 * One output value: a sentence-case label, the value in mono (wraps or scrolls,
 * never truncated) and a per-row Copy button. Values are the product, so they
 * never collapse to an ellipsis (DESIGN.md, Typography).
 */
export function OutputRow({
  label,
  value,
  copyable = true,
  mono = true,
  children,
}: {
  readonly label: string;
  readonly value?: string;
  readonly copyable?: boolean;
  readonly mono?: boolean;
  readonly children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    if (value === undefined) return;
    try {
      await copyText(value);
      setError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not copy');
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value !== undefined ? (
          <p
            data-output-value={value}
            className={cn(
              'mt-1 break-words text-sm whitespace-pre-wrap',
              mono && 'font-mono tabular-nums',
            )}
          >
            {value}
          </p>
        ) : null}
        {children}
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      {value !== undefined && copyable ? (
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-border-strong bg-surface px-3 text-sm hover:bg-surface-hover max-sm:h-11"
        >
          {copied ? (
            <CheckIcon aria-hidden="true" className="size-4" />
          ) : (
            <CopyIcon aria-hidden="true" className="size-4" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      ) : null}
    </div>
  );
}

export function OutputList({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={cn('divide-y divide-border', className)}>{children}</div>;
}
