import { crc32, deflateRawSync } from 'node:zlib';

/**
 * A Word document, built byte by byte in the test process.
 *
 * The guard that uploads this has to reach `mammoth`, so the file must be a real
 * zip with a real `word/document.xml`, not a JSON stand-in. It is generated
 * here rather than committed: a binary fixture in the repository is a file
 * nobody reviews, and this keeps the document's contents visible in the test
 * that asserts on them.
 *
 * Nothing here is copied from anywhere. The parts are the minimum a `.docx`
 * needs — content types, package relationships, the document part and its own
 * relationships — with the markup written below.
 */

interface Part {
  readonly name: string;
  readonly contents: string;
}

interface Stored {
  readonly raw: Buffer;
  readonly deflated: Buffer;
  readonly name: Buffer;
}

function localHeader({ raw, deflated, name }: Stored): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(8, 8); // deflate
  header.writeUInt16LE(0, 10); // time
  header.writeUInt16LE(0, 12); // date
  // The checksum is of the bytes as they were before deflating, which is what
  // a zip reader checks the inflated output against.
  header.writeUInt32LE(crc32(raw), 14);
  header.writeUInt32LE(deflated.length, 18); // compressed
  header.writeUInt32LE(raw.length, 22); // uncompressed
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28); // extra
  return Buffer.concat([header, name]);
}

function centralHeader({ raw, deflated, name }: Stored, offset: number): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4); // version made by
  header.writeUInt16LE(20, 6); // version needed
  header.writeUInt16LE(0, 8); // flags
  header.writeUInt16LE(8, 10); // deflate
  header.writeUInt16LE(0, 12); // time
  header.writeUInt16LE(0, 14); // date
  header.writeUInt32LE(crc32(raw), 16);
  header.writeUInt32LE(deflated.length, 20); // compressed
  header.writeUInt32LE(raw.length, 24); // uncompressed
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30); // extra
  header.writeUInt16LE(0, 32); // comment
  header.writeUInt16LE(0, 34); // disk
  header.writeUInt16LE(0, 36); // internal attributes
  header.writeUInt32LE(0, 38); // external attributes
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, name]);
}

function zip(parts: readonly Part[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const part of parts) {
    const raw = Buffer.from(part.contents, 'utf8');
    const stored: Stored = {
      raw,
      deflated: deflateRawSync(raw),
      name: Buffer.from(part.name, 'utf8'),
    };
    const local = localHeader(stored);
    chunks.push(local, stored.deflated);
    central.push(centralHeader(stored, offset));
    offset += local.length + stored.deflated.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // disk
  end.writeUInt16LE(0, 6); // central directory disk
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...chunks, directory, end]);
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const PACKAGE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

/** The link the sanitiser has to refuse when a document arrives this way. */
const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:alert(1)" TargetMode="External"/>
</Relationships>`;

const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Quarterly update</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Some </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>bold</w:t></w:r>
      <w:r><w:t xml:space="preserve"> words and a literal </w:t></w:r>
      <w:r><w:t>&lt;b&gt;tag&lt;/b&gt;</w:t></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p>
      <w:hyperlink r:id="rId1"><w:r><w:t>click me</w:t></w:r></w:hyperlink>
    </w:p>
  </w:body>
</w:document>`;

/** A genuine `.docx` containing a heading, bold text, literal markup and a bad link. */
export function makeDocx(): Buffer {
  return zip([
    { name: '[Content_Types].xml', contents: CONTENT_TYPES },
    { name: '_rels/.rels', contents: PACKAGE_RELS },
    { name: 'word/document.xml', contents: DOCUMENT },
    { name: 'word/_rels/document.xml.rels', contents: DOCUMENT_RELS },
  ]);
}

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
