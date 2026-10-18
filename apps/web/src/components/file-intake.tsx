import { buildAcceptAttribute, matchesFilePattern } from '@omnitool/tool-core';
import { UploadIcon } from 'lucide-react';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  useId,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

export interface FileIntakeProps {
  readonly accept: readonly string[];
  readonly onFiles: (files: File[]) => void;
  readonly label?: string;
  readonly hint?: string;
  readonly buttonLabel?: string;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function FileIntake({
  accept,
  onFiles,
  label = 'Add a file',
  hint = 'Drag and drop, paste, or choose a file.',
  buttonLabel = 'Choose file',
  multiple = false,
  disabled = false,
  className,
}: FileIntakeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptAttribute = buildAcceptAttribute(accept);

  function intake(files: FileList | File[] | null | undefined) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const accepted =
      accept.length === 0
        ? list
        : list.filter((file) => accept.some((pattern) => matchesFilePattern(file, pattern)));

    if (accepted.length === 0) {
      setError(`That file type is not supported here. Accepted: ${accept.join(', ')}`);
      return;
    }

    setError(null);
    onFiles(multiple ? accepted : accepted.slice(0, 1));
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    intake(event.dataTransfer.files);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    if (disabled) return;
    const files = event.clipboardData?.files;
    if (files && files.length > 0) {
      event.preventDefault();
      intake(files);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    intake(event.target.files);
    event.target.value = '';
  }

  return (
    <div className={className}>
      <fieldset
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'flex min-w-0 flex-col items-start gap-3 rounded-panel border border-dashed border-border-strong bg-surface p-5',
          'transition-colors focus-within:border-ring',
          dragging && 'border-solid border-primary bg-highlight/20',
          disabled && 'opacity-60',
        )}
      >
        <legend className="sr-only">{label}</legend>
        <div className="flex items-center gap-2">
          <UploadIcon aria-hidden="true" className="size-5 text-muted-foreground" />
          <p aria-hidden="true" className="font-medium">
            {label}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{hint}</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center justify-center rounded-control border border-border-strong bg-surface px-3 text-sm font-medium hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50 max-sm:min-h-11"
        >
          {buttonLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={multiple}
          accept={acceptAttribute || undefined}
          onChange={handleChange}
          aria-label={buttonLabel}
        />
      </fieldset>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
