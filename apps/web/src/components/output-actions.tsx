import { CheckIcon, CopyIcon, DownloadIcon } from 'lucide-react';
import { useState } from 'react';
import { copyText, downloadText } from '@/lib/download';
import { Button } from './ui/button';

export function OutputActions({
  text,
  filename,
  mime = 'text/plain',
  disabled = false,
}: {
  readonly text: string;
  readonly filename: string;
  readonly mime?: string;
  readonly disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await copyText(text);
      setError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not copy');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={copy} disabled={disabled} aria-live="polite">
        {copied ? (
          <CheckIcon aria-hidden="true" className="size-4" />
        ) : (
          <CopyIcon aria-hidden="true" className="size-4" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => downloadText(text, filename, mime)}
        disabled={disabled}
      >
        <DownloadIcon aria-hidden="true" className="size-4" />
        Download
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
