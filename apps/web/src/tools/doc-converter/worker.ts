import { convertDocument, FILE_INPUT_LIMIT } from '@omnitool/tool-core/doc';
import { inspectZip } from '@omnitool/tool-core/zip';
import * as Comlink from 'comlink';
import mammoth from 'mammoth';
import type { DocxInput, DocxResult, DocxWorkerApi } from './types';

/**
 * Word documents, read in a worker.
 *
 * The order matters. The archive is checked by our own zip guard first (DEC-86),
 * on the numbers it writes about itself, so a file built to expand is refused
 * before `mammoth` inflates a byte of it. Only then is the document converted to
 * HTML, and that HTML goes through the same sanitiser every other HTML route
 * uses — a Word file is somebody else's file, and what it contains is markup we
 * did not write.
 *
 * Images are dropped before they are decoded: mammoth would otherwise inline
 * each one as a base64 data URI, which is a large amount of memory and bytes for
 * something the sanitiser then removes.
 */

/** The reporter shows the first few messages; a broken file can produce hundreds. */
const MAX_WARNINGS = 5;

function readableMessages(messages: readonly { type: string; message: string }[]): string[] {
  const unique = [...new Set(messages.map((message) => message.message.trim()))].filter(
    (message) => message !== '',
  );
  if (unique.length <= MAX_WARNINGS) return unique;
  return [
    ...unique.slice(0, MAX_WARNINGS),
    `The document also produced ${unique.length - MAX_WARNINGS} more notes that are not shown.`,
  ];
}

/**
 * A Comlink proxied callback hands a port back to the page, so the worker has to
 * let it settle before it answers. If it reports progress and then returns or
 * throws in the same task, Firefox drops the answer and the panel waits forever
 * with no error — Chromium delivers it, so this only shows in one engine. The
 * glyph search hit the same thing (Session 021); both await their last call.
 */
type Progress = (progress: number, label?: string, phase?: string) => void | Promise<void>;

const dropImages = mammoth.images.imgElement(async () => ({
  // Nothing is read and no URL exists: the empty value stops the converter
  // building a data URI, and the sanitiser drops the element and counts it.
  // url-check: local-asset
  src: '',
}));

async function readDocx(input: DocxInput, onProgress: Progress): Promise<DocxResult> {
  const bytes = new Uint8Array(input.buffer);
  if (bytes.byteLength > FILE_INPUT_LIMIT) {
    throw new Error(
      `That file is ${(bytes.byteLength / (1024 * 1024)).toFixed(1)} MB. Word documents are read up to ${(
        FILE_INPUT_LIMIT / (1024 * 1024)
      ).toFixed(0)} MB.`,
    );
  }

  await onProgress(8, 'Checking the archive', 'check');
  const inspection = inspectZip(bytes);
  if (!inspection.ok) throw new Error(inspection.reason);

  onProgress(30, 'Reading the document', 'read');
  let html: string;
  let messages: { type: string; message: string }[];
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: input.buffer },
      { convertImage: dropImages },
    );
    html = result.value;
    messages = result.messages;
  } catch {
    throw new Error(
      `${input.filename} could not be read as a Word document. It may be damaged, or saved in the older .doc format rather than .docx.`,
    );
  }

  onProgress(78, 'Converting to text', 'convert');
  const { document, warnings } = convertDocument({ format: 'html', text: html });

  await onProgress(100, 'Done', 'done');
  return { document, warnings: [...readableMessages(messages), ...warnings] };
}

const api: DocxWorkerApi = { run: readDocx };

Comlink.expose(api);
