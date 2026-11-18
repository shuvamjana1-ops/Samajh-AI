import { verifyFileSignature } from './documentLogic';

export type SizeUnit = 'B' | 'KB' | 'MB';
export type OutputFormatOption = 'original' | 'image/jpeg' | 'image/png' | 'application/pdf';
export type SupportedDocMime = 'image/jpeg' | 'image/png' | 'application/pdf';

export const MIN_TARGET_BYTES = 1024; // 1 KB
export const MAX_TARGET_BYTES = 50 * 1024 * 1024; // 50 MB

export interface SizePreset {
  id: string;
  labelEn: string;
  labelHi: string;
  amount: string;
  unit: SizeUnit;
  bytes: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  {
    id: 'samajh-8mb',
    labelEn: 'Samajh max (8 MB)',
    labelHi: 'Samajh सीमा (8 MB)',
    amount: '8',
    unit: 'MB',
    bytes: 8 * 1024 * 1024,
  },
  {
    id: '2mb',
    labelEn: '2 MB',
    labelHi: '2 MB',
    amount: '2',
    unit: 'MB',
    bytes: 2 * 1024 * 1024,
  },
  {
    id: '1mb',
    labelEn: '1 MB',
    labelHi: '1 MB',
    amount: '1',
    unit: 'MB',
    bytes: 1024 * 1024,
  },
  {
    id: '500kb',
    labelEn: '500 KB',
    labelHi: '500 KB',
    amount: '500',
    unit: 'KB',
    bytes: 500 * 1024,
  },
  {
    id: '200kb',
    labelEn: '200 KB',
    labelHi: '200 KB',
    amount: '200',
    unit: 'KB',
    bytes: 200 * 1024,
  },
  {
    id: '100kb',
    labelEn: '100 KB',
    labelHi: '100 KB',
    amount: '100',
    unit: 'KB',
    bytes: 100 * 1024,
  },
];

export function parseTargetSizeBytes(amountInput: string | number, unit: SizeUnit): number | null {
  const numeric = typeof amountInput === 'number' ? amountInput : Number(String(amountInput).trim());
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const multiplier = unit === 'MB' ? 1024 * 1024 : unit === 'KB' ? 1024 : 1;
  const rawBytes = Math.round(numeric * multiplier);
  if (rawBytes < MIN_TARGET_BYTES || rawBytes > MAX_TARGET_BYTES) {
    return null;
  }
  return rawBytes;
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function inferDocumentMime(fileName: string, mimeType: string): SupportedDocMime | null {
  const normalized = mimeType.toLowerCase().trim();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'image/jpeg';
  if (normalized === 'image/png') return 'image/png';
  if (normalized === 'application/pdf') return 'application/pdf';

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  return null;
}

export function buildCompressedFilename(originalName: string, targetMime: SupportedDocMime): string {
  const leaf = originalName.split(/[/\\]/).pop() || 'document';
  const base = leaf.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'document';
  const ext =
    targetMime === 'image/jpeg' ? 'jpg' : targetMime === 'image/png' ? 'png' : 'pdf';
  return `${base}-compressed.${ext}`;
}

export function computeCompressionSearchCeiling(
  targetBytes: number,
  targetMime: SupportedDocMime,
  exactSize: boolean
): number {
  if (!exactSize) return targetBytes;
  const minPad =
    targetMime === 'image/jpeg' ? 4 : targetMime === 'image/png' ? 14 : 4;
  return Math.max(256, targetBytes - minPad);
}

/**
 * Splits a non-negative remainder >= minSegment into chunks within [minSegment, maxSegment]
 * so every emitted format segment is well-formed.
 */
function planPaddingSegments(totalPad: number, minSegment: number, maxSegment: number): number[] {
  const sizes: number[] = [];
  let remaining = totalPad;
  while (remaining > 0) {
    if (remaining <= maxSegment) {
      sizes.push(remaining);
      break;
    }
    const nextChunk = Math.min(maxSegment, remaining - minSegment);
    sizes.push(nextChunk);
    remaining -= nextChunk;
  }
  return sizes;
}

/**
 * Pads a valid JPEG byte array to exact `targetBytes` by inserting spec-compliant
 * JPEG COM (0xFF 0xFE) comment segments right before Start-of-Scan (0xFF 0xDA) or EOI.
 */
export function padJpegToExactBytes(jpegBytes: Uint8Array, targetBytes: number): Uint8Array {
  if (!verifyFileSignature(jpegBytes, 'image/jpeg')) {
    throw new Error('Invalid JPEG stream');
  }
  if (targetBytes <= jpegBytes.length) return jpegBytes;

  // Walk markers from byte 2 to find SOS (0xFF 0xDA) or EOI (0xFF 0xD9)
  let insertIndex = -1;
  let offset = 2;
  while (offset + 1 < jpegBytes.length) {
    if (jpegBytes[offset] !== 0xff) break;
    const marker = jpegBytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      insertIndex = offset;
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (offset + 3 >= jpegBytes.length) break;
    const segLen = (jpegBytes[offset + 2] << 8) | jpegBytes[offset + 3];
    if (segLen < 2 || offset + 2 + segLen > jpegBytes.length) break;
    offset += 2 + segLen;
  }

  if (insertIndex === -1) {
    throw new Error('JPEG missing SOS/EOI marker');
  }

  const diff = targetBytes - jpegBytes.length;
  if (diff < 4) {
    throw new Error('Cannot pad JPEG by fewer than 4 bytes cleanly');
  }

  const segmentSizes = planPaddingSegments(diff, 4, 65537);
  const out = new Uint8Array(targetBytes);
  out.set(jpegBytes.slice(0, insertIndex), 0);

  let cursor = insertIndex;
  for (const segTotal of segmentSizes) {
    const lenField = segTotal - 2; // includes 2-byte length field
    out[cursor] = 0xff;
    out[cursor + 1] = 0xfe;
    out[cursor + 2] = (lenField >> 8) & 0xff;
    out[cursor + 3] = lenField & 0xff;
    out.fill(0x20, cursor + 4, cursor + segTotal);
    cursor += segTotal;
  }

  // Re-append SOS + entropy data + EOI
  out.set(jpegBytes.slice(insertIndex), cursor);
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Pads a valid PNG byte array to exact `targetBytes` by inserting spec-compliant
 * CRC-checked PNG `tEXt` ancillary chunks immediately before `IEND`.
 */
export function padPngToExactBytes(pngBytes: Uint8Array, targetBytes: number): Uint8Array {
  if (!verifyFileSignature(pngBytes, 'image/png')) {
    throw new Error('Invalid PNG stream');
  }
  if (targetBytes <= pngBytes.length) return pngBytes;

  // Locate IEND chunk from standard offset traversal
  let offset = 8;
  let iendOffset = -1;
  while (offset + 12 <= pngBytes.length) {
    const len =
      ((pngBytes[offset] << 24) >>> 0) +
      (pngBytes[offset + 1] << 16) +
      (pngBytes[offset + 2] << 8) +
      pngBytes[offset + 3];
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7]
    );
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset += 12 + len;
  }
  if (iendOffset === -1) {
    throw new Error('PNG missing IEND chunk');
  }

  const diff = targetBytes - pngBytes.length;
  if (diff < 14) {
    throw new Error('Cannot pad PNG by fewer than 14 bytes cleanly');
  }

  // Each tEXt chunk has 12 wrapper bytes + 'p\0' (2 bytes) + payload spaces
  const segmentSizes = planPaddingSegments(diff, 14, 1024 * 1024);
  const out = new Uint8Array(targetBytes);
  out.set(pngBytes.slice(0, iendOffset), 0);

  let cursor = iendOffset;
  for (const chunkTotal of segmentSizes) {
    const dataLen = chunkTotal - 12;
    out[cursor] = (dataLen >>> 24) & 0xff;
    out[cursor + 1] = (dataLen >>> 16) & 0xff;
    out[cursor + 2] = (dataLen >>> 8) & 0xff;
    out[cursor + 3] = dataLen & 0xff;
    // Chunk type "tEXt"
    out[cursor + 4] = 0x74;
    out[cursor + 5] = 0x45;
    out[cursor + 6] = 0x58;
    out[cursor + 7] = 0x74;
    // Keyword "p\0" followed by ASCII spaces
    out[cursor + 8] = 0x70;
    out[cursor + 9] = 0x00;
    if (dataLen > 2) {
      out.fill(0x20, cursor + 10, cursor + 8 + dataLen);
    }
    const crc = crc32(out.subarray(cursor + 4, cursor + 8 + dataLen));
    out[cursor + 8 + dataLen] = (crc >>> 24) & 0xff;
    out[cursor + 9 + dataLen] = (crc >>> 16) & 0xff;
    out[cursor + 10 + dataLen] = (crc >>> 8) & 0xff;
    out[cursor + 11 + dataLen] = crc & 0xff;
    cursor += chunkTotal;
  }

  out.set(pngBytes.slice(iendOffset), cursor);
  return out;
}

/**
 * Pads a valid PDF byte array to exact `targetBytes` by appending a trailing PDF
 * comment after %%EOF, leaving all xref byte offsets intact.
 */
export function padPdfToExactBytes(pdfBytes: Uint8Array, targetBytes: number): Uint8Array {
  if (!verifyFileSignature(pdfBytes, 'application/pdf')) {
    throw new Error('Invalid PDF stream');
  }
  if (targetBytes <= pdfBytes.length) return pdfBytes;

  const diff = targetBytes - pdfBytes.length;
  const out = new Uint8Array(targetBytes);
  out.set(pdfBytes, 0);

  let cursor = pdfBytes.length;
  if (diff === 1) {
    out[cursor] = 0x0a;
    return out;
  }
  if (diff === 2) {
    out[cursor] = 0x0a;
    out[cursor + 1] = 0x25;
    return out;
  }
  out[cursor] = 0x0a;
  out[cursor + 1] = 0x25;
  out.fill(0x30, cursor + 2, targetBytes - 1);
  out[targetBytes - 1] = 0x0a;
  return out;
}

export interface PdfImageSpec {
  jpegBytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

/**
 * Builds a clean multi-page PDF-1.4 document embedding JPEG image pages with exact xref offsets.
 */
export function buildJpegPdf(images: PdfImageSpec[]): Uint8Array {
  if (images.length === 0) {
    throw new Error('At least one page image is required to build PDF');
  }

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  let byteOffset = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    parts.push(b);
    byteOffset += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    parts.push(b);
    byteOffset += b.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const offsets: number[] = [0]; // obj 0 free entry

  // Object 1: Catalog
  // Object 2: Pages
  // For each page i (0..n-1):
  //   pageObj = 3 + i*3
  //   contentObj = 4 + i*3
  //   imgObj = 5 + i*3
  const pageRefs = images.map((_, idx) => `${3 + idx * 3} 0 R`).join(' ');

  offsets.push(byteOffset);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets.push(byteOffset);
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [ ${pageRefs} ] /Count ${images.length} >>\nendobj\n`);

  images.forEach((img, idx) => {
    if (!verifyFileSignature(img.jpegBytes, 'image/jpeg')) {
      throw new Error(`Page ${idx + 1} image is not a valid JPEG`);
    }
    const w = Math.max(1, Math.round(img.widthPx));
    const h = Math.max(1, Math.round(img.heightPx));
    // Standard 72 pt/in PDF page dimensions bounded comfortably within A4/screen aspect
    const scale = 595 / w;
    const ptW = Math.round(w * scale * 100) / 100;
    const ptH = Math.round(h * scale * 100) / 100;

    const pageId = 3 + idx * 3;
    const contentId = 4 + idx * 3;
    const imgId = 5 + idx * 3;

    offsets.push(byteOffset);
    pushStr(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );

    const contentStream = `q\n${ptW} 0 0 ${ptH} 0 0 cm\n/Im0 Do\nQ\n`;
    offsets.push(byteOffset);
    pushStr(
      `${contentId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    offsets.push(byteOffset);
    pushStr(
      `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpegBytes.length} >>\nstream\n`
    );
    pushBytes(img.jpegBytes);
    pushStr('\nendstream\nendobj\n');
  });

  const xrefOffset = byteOffset;
  pushStr(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i += 1) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const combined = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    combined.set(p, pos);
    pos += p.length;
  }
  return combined;
}

/**
 * Extracts raw JPEG streams (SOI 0xFF 0xD8 .. EOI 0xFF 0xD9) embedded inside PDF /DCTDecode streams.
 */
export function extractEmbeddedJpegsFromPdf(pdfBytes: Uint8Array): Uint8Array[] {
  if (!verifyFileSignature(pdfBytes, 'application/pdf')) return [];

  const results: Uint8Array[] = [];
  const latin1 = new TextDecoder('latin1').decode(pdfBytes);
  const dctRegex = /\/Filter\s*(?:\[\s*)?\/DCTDecode[\s\S]{0,180}?stream\r?\n/g;

  let match: RegExpExecArray | null;
  while ((match = dctRegex.exec(latin1)) !== null) {
    const streamStart = match.index + match[0].length;
    const endIdx = latin1.indexOf('endstream', streamStart);
    if (endIdx === -1) continue;

    // Trim optional CR/LF right before endstream
    let sliceEnd = endIdx;
    if (sliceEnd > streamStart && pdfBytes[sliceEnd - 1] === 0x0a) sliceEnd -= 1;
    if (sliceEnd > streamStart && pdfBytes[sliceEnd - 1] === 0x0d) sliceEnd -= 1;

    const candidate = pdfBytes.slice(streamStart, sliceEnd);
    if (verifyFileSignature(candidate, 'image/jpeg')) {
      results.push(candidate);
    }
  }

  return results;
}
