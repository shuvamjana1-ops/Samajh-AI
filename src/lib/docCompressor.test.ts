import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCompressedFilename,
  buildJpegPdf,
  computeCompressionSearchCeiling,
  extractEmbeddedJpegsFromPdf,
  formatByteSize,
  padJpegToExactBytes,
  padPdfToExactBytes,
  padPngToExactBytes,
  parseTargetSizeBytes,
} from './docCompressor';
import { stripImageMetadata, verifyFileSignature } from './documentLogic';

function makeMinimalJpeg(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0
    0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x11, 0x22, // SOS + data
    0xff, 0xd9, // EOI
  ]);
}

function makeMinimalPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR len + type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00,
    0x90, 0x77, 0x53, 0xde, // IHDR CRC
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND
  ]);
}

test('parseTargetSizeBytes converts KB, MB, and B within safe limits', () => {
  assert.equal(parseTargetSizeBytes('8', 'MB'), 8 * 1024 * 1024);
  assert.equal(parseTargetSizeBytes('200', 'KB'), 200 * 1024);
  assert.equal(parseTargetSizeBytes('2048', 'B'), 2048);
  assert.equal(parseTargetSizeBytes('0', 'KB'), null);
  assert.equal(parseTargetSizeBytes('-5', 'MB'), null);
  assert.equal(parseTargetSizeBytes('99', 'MB'), null);
});

test('padJpegToExactBytes produces exact byte count and valid signature', () => {
  const jpeg = makeMinimalJpeg();
  const target = 70_000; // tests multi-COM-segment splitting > 65537 bytes
  const padded = padJpegToExactBytes(jpeg, target);

  assert.equal(padded.length, target);
  assert.equal(verifyFileSignature(padded, 'image/jpeg'), true);
  assert.equal(padded[padded.length - 2], 0xff);
  assert.equal(padded[padded.length - 1], 0xd9);

  // Stripping metadata should recover the exact unpadded JPEG stream
  const stripped = stripImageMetadata(padded, 'image/jpeg');
  assert.equal(stripped.length, jpeg.length);
});

test('padPngToExactBytes produces exact byte count and valid IEND termination', () => {
  const png = makeMinimalPng();
  const target = 4096;
  const padded = padPngToExactBytes(png, target);

  assert.equal(padded.length, target);
  assert.equal(verifyFileSignature(padded, 'image/png'), true);
  assert.deepEqual(
    padded.slice(padded.length - 12),
    new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
  );
});

test('buildJpegPdf + extractEmbeddedJpegsFromPdf roundtrip and padPdfToExactBytes hit exact size', () => {
  const jpeg = makeMinimalJpeg();
  const pdf = buildJpegPdf([{ jpegBytes: jpeg, widthPx: 800, heightPx: 1100 }]);
  assert.equal(verifyFileSignature(pdf, 'application/pdf'), true);

  const extracted = extractEmbeddedJpegsFromPdf(pdf);
  assert.equal(extracted.length, 1);
  assert.deepEqual(extracted[0], jpeg);

  const exactPdfTarget = pdf.length + 512;
  const paddedPdf = padPdfToExactBytes(pdf, exactPdfTarget);
  assert.equal(paddedPdf.length, exactPdfTarget);
  assert.equal(verifyFileSignature(paddedPdf, 'application/pdf'), true);
});

test('helpers format byte sizes, search ceilings, and filenames cleanly', () => {
  assert.equal(formatByteSize(512), '512 B');
  assert.equal(formatByteSize(200 * 1024), '200.0 KB');
  assert.equal(formatByteSize(8 * 1024 * 1024), '8.00 MB');
  assert.equal(computeCompressionSearchCeiling(102400, 'image/jpeg', true), 102396);
  assert.equal(computeCompressionSearchCeiling(102400, 'image/png', true), 102386);
  assert.equal(computeCompressionSearchCeiling(102400, 'image/jpeg', false), 102400);
  assert.equal(buildCompressedFilename('my contract scan.png', 'image/jpeg'), 'my_contract_scan-compressed.jpg');
});
