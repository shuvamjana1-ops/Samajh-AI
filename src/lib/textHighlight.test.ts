import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeGraphemeHighlightMask,
  extractGraphemeSliceHighlight,
  splitHighlightSegments,
} from './textHighlight';
import { segmentGraphemes } from './textScramble';

test('splitHighlightSegments highlights explicit Latin phrases cleanly at word boundaries', () => {
  const segments = splitHighlightSegments('Built to make everyday paperwork readable.', {
    words: ['read', 'readable.'],
  });
  assert.deepEqual(segments, [
    { text: 'Built to make everyday paperwork ', kind: 'plain' },
    { text: 'readable.', kind: 'phrase' },
  ]);
});

test('splitHighlightSegments highlights Devanagari phrases cleanly', () => {
  const segments = splitHighlightSegments('कागज़ात, आसान भाषा में।', {
    words: ['आसान भाषा में।'],
  });
  assert.deepEqual(segments, [
    { text: 'कागज़ात, ', kind: 'plain' },
    { text: 'आसान भाषा में।', kind: 'phrase' },
  ]);
});

test('autoDetectDocumentTerms highlights money, deadlines, and risk clauses without overlaps', () => {
  const clause =
    'Clause 12: Deduct painting costs from your Rs 1,80,000 deposit at their sole discretion after 60 days notice.';
  const segments = splitHighlightSegments(clause, { autoDetectDocumentTerms: true });
  const flagged = segments.filter((s) => s.kind !== 'plain');

  assert.deepEqual(flagged, [
    { text: 'Rs 1,80,000', kind: 'amount' },
    { text: 'sole discretion', kind: 'risk' },
    { text: '60 days', kind: 'deadline' },
  ]);
});

test('autoDetectDocumentTerms highlights Hindi amounts, deadlines, and traps', () => {
  const hiText = 'मकान मालिक बिना रसीद दिखाए 1,80,000 रुपये से कटौती कर सकता है (60 दिन पहले)।';
  const segments = splitHighlightSegments(hiText, { autoDetectDocumentTerms: true });
  const flagged = segments.filter((s) => s.kind !== 'plain');

  assert.deepEqual(flagged, [
    { text: 'बिना रसीद दिखाए', kind: 'risk' },
    { text: '1,80,000 रुपये', kind: 'amount' },
    { text: '60 दिन', kind: 'deadline' },
  ]);
});

test('computeGraphemeHighlightMask aligns multi-codepoint Devanagari graphemes', () => {
  const text = 'कागज़ात, आसान भाषा में।';
  const graphemes = segmentGraphemes(text);
  const mask = computeGraphemeHighlightMask(graphemes, ['आसान भाषा में।']);
  const runs = extractGraphemeSliceHighlight(text, ['आसान भाषा में।']);

  assert.equal(mask.length, graphemes.length);
  assert.deepEqual(runs, [
    { text: 'कागज़ात, ', highlighted: false },
    { text: 'आसान भाषा में।', highlighted: true },
  ]);
});
