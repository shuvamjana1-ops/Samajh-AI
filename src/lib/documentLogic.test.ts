import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerDemoQuestion,
  buildSpeechScript,
  clampPreviewZoom,
  DEFAULT_PREVIEW_ZOOM,
  formatPreviewAltText,
  parseAndValidateAnalysis,
  parseAndValidateAskResponse,
  stepPreviewZoom,
  stripImageMetadata,
  validateDocumentFiles,
  verifyFileSignature,
} from './documentLogic';
import { DEMO_ANALYSES } from '../data/demoAgreement';

test('validateDocumentFiles accepts valid JPG/PNG/PDF within 8 MB limit', () => {
  const res = validateDocumentFiles([
    { name: 'lease-page-1.jpg', type: 'image/jpeg', size: 500_000 },
    { name: 'lease-page-2.pdf', type: 'application/pdf', size: 1_200_000 },
  ]);
  assert.equal(res.valid, true);
});

test('validateDocumentFiles rejects unsupported mime types, >8 MB, and >5 pages', () => {
  const badType = validateDocumentFiles([
    { name: 'photo.webp', type: 'image/webp', size: 1024 },
  ]);
  assert.equal(badType.valid, false);
  assert.match(badType.errorMessage ?? '', /JPG, PNG, or PDF/);

  const tooBig = validateDocumentFiles([
    { name: 'scan.jpg', type: 'image/jpeg', size: 9 * 1024 * 1024 },
  ]);
  assert.equal(tooBig.valid, false);
  assert.match(tooBig.errorMessage ?? '', /8 MB/);

  const tooMany = validateDocumentFiles(
    [{ name: 'p6.png', type: 'image/png', size: 1000 }],
    5
  );
  assert.equal(tooMany.valid, false);
  assert.match(tooMany.errorMessage ?? '', /5 pages/);
});

test('verifyFileSignature checks magic bytes for JPG, PNG, and PDF', () => {
  assert.equal(verifyFileSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'), true);
  assert.equal(verifyFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'), true);
  assert.equal(verifyFileSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf'), true);
  assert.equal(verifyFileSignature(new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x3e]), 'image/png'), false);
});

test('stripImageMetadata strips JPEG EXIF APP1 segment while preserving image data', () => {
  // SOI + APP1 (EXIF, length 6) + SOS + EOI
  const jpgWithExif = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66,
    0xff, 0xda, 0x01, 0x02,
    0xff, 0xd9,
  ]);
  const stripped = stripImageMetadata(jpgWithExif, 'image/jpeg');
  assert.deepEqual(Array.from(stripped), [0xff, 0xd8, 0xff, 0xda, 0x01, 0x02, 0xff, 0xd9]);
});

test('parseAndValidateAnalysis handles markdown fences, normalizes severity, and caps array/string lengths', () => {
  const manySteps = Array.from({ length: 30 }, (_, i) => `Step ${i + 1}`);
  const raw = `\`\`\`json
  {
    "readable": true,
    "type": "Loan Agreement",
    "summary": "${'A'.repeat(1600)}",
    "deadlines": [{ "when": "10th monthly", "what": "EMI due", "note": "Penalty applies" }],
    "money": [{ "label": "Processing fee", "amount": "Rs 2,500", "note": "Non-refundable" }],
    "risks": [{ "sev": "HIGH", "clause": "Clause 4", "text": "Prepayment penalty of 4%." }],
    "steps": ${JSON.stringify(manySteps)}
  }
  \`\`\``;

  const parsed = parseAndValidateAnalysis(raw);
  assert.equal(parsed.readable, true);
  assert.equal(parsed.type, 'Loan Agreement');
  assert.equal(parsed.summary.length, 1400);
  assert.equal(parsed.risks[0]?.sev, 'high');
  assert.equal(parsed.steps.length, 20);
});

test('parseAndValidateAnalysis preserves unreadable document flag', () => {
  const raw = JSON.stringify({
    readable: false,
    unreadableReason: 'Photo is too dark to read the numbers.',
    type: 'Unknown',
    summary: '',
    deadlines: [],
    money: [],
    risks: [],
    steps: [],
  });

  const parsed = parseAndValidateAnalysis(raw);
  assert.equal(parsed.readable, false);
  assert.match(parsed.unreadableReason ?? '', /too dark/);
});

test('parseAndValidateAskResponse parses grounded answer', () => {
  const res = parseAndValidateAskResponse(
    JSON.stringify({
      answer: 'The document does not mention pet fees.',
      citedClause: '',
      notInDocument: true,
    })
  );
  assert.equal(res.notInDocument, true);
  assert.equal(res.citedClause, undefined);
});

test('answerDemoQuestion grounds answers in sample agreement and admits missing info', () => {
  const depositAnswer = answerDemoQuestion('Can the landlord cut my security deposit?', 'en');
  assert.equal(depositAnswer.notInDocument, false);
  assert.match(depositAnswer.answer, /1,80,000/);

  const hindiNotice = answerDemoQuestion('मकान मालिक कितने दिन का नोटिस देगा?', 'hi');
  assert.equal(hindiNotice.notInDocument, false);
  assert.match(hindiNotice.answer, /15/);

  const missingInfo = answerDemoQuestion('Is car parking included?', 'en');
  assert.equal(missingInfo.notInDocument, true);
  assert.match(missingInfo.answer, /does not say/i);
});

test('buildSpeechScript constructs readable narration in English and Hindi', () => {
  const hiScript = buildSpeechScript(DEMO_ANALYSES.hi, 'hi');
  assert.match(hiScript, /मकान किराया समझौता/);
  assert.match(hiScript, /मुख्य जोखिम/);
});

test('formatPreviewAltText generates readable alt descriptions from filenames', () => {
  assert.equal(
    formatPreviewAltText('rental_agreement-2026_page1.jpg', 1, 3),
    'Document preview of Rental Agreement 2026 Page 1 (page 1 of 3)'
  );
  assert.equal(
    formatPreviewAltText('MedicalReportFinal.v2.png', 2, 2),
    'Document preview of Medical Report Final V 2 (page 2 of 2)'
  );
  assert.equal(
    formatPreviewAltText('bank.notice_scan.jpg', 1, 1, 'hi'),
    'Bank Notice Scan का प्रीव्यू (पेज 1)'
  );
  assert.equal(
    formatPreviewAltText('.png', 1),
    'Document preview of Uploaded Document (page 1)'
  );
});

test('preview zoom helpers step cleanly within 100% to 300% bounds', () => {
  assert.equal(DEFAULT_PREVIEW_ZOOM, 100);
  assert.equal(stepPreviewZoom(100, 'out'), 100);
  assert.equal(stepPreviewZoom(100, 'in'), 150);
  assert.equal(stepPreviewZoom(150, 'in'), 200);
  assert.equal(stepPreviewZoom(300, 'in'), 300);
  assert.equal(stepPreviewZoom(300, 'out'), 250);
  assert.equal(clampPreviewZoom(999), 300);
  assert.equal(clampPreviewZoom(Number.NaN), 100);
});
