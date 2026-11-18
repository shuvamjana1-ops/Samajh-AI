import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeScrambleFrame,
  SCRAMBLE_GLYPHS_DEVANAGARI,
  SCRAMBLE_GLYPHS_LATIN,
  segmentGraphemes,
  selectGlyphPool,
} from './textScramble';

test('segmentGraphemes preserves Hindi combining vowel marks intact', () => {
  const hindi = 'कदम उठाएं।';
  const graphemes = segmentGraphemes(hindi);
  assert.equal(graphemes.join(''), hindi);
  assert.ok(graphemes.length < Array.from(hindi).length);
  assert.equal(selectGlyphPool(hindi), SCRAMBLE_GLYPHS_DEVANAGARI);
  assert.equal(selectGlyphPool('Understand any document.'), SCRAMBLE_GLYPHS_LATIN);
});

test('computeScrambleFrame preserves spaces/punctuation and settles cleanly to original text', () => {
  const input = 'Understand any document.';
  const graphemes = segmentGraphemes(input);

  const start = computeScrambleFrame(graphemes, 0, 1, SCRAMBLE_GLYPHS_LATIN);
  assert.equal(start.settled, false);
  assert.equal(start.resolvedText, '');
  assert.equal(start.fullText.length, input.length);
  assert.equal(start.fullText[10], ' ');
  assert.equal(start.fullText[input.length - 1], '.');

  const mid = computeScrambleFrame(graphemes, 0.5, 4, SCRAMBLE_GLYPHS_LATIN);
  assert.equal(mid.settled, false);
  assert.ok(mid.resolvedText.length > 0);
  assert.ok(input.startsWith(mid.resolvedText));
  assert.ok(mid.scramblingText.length > 0);

  const done = computeScrambleFrame(graphemes, 1, 10, SCRAMBLE_GLYPHS_LATIN);
  assert.equal(done.settled, true);
  assert.equal(done.resolvedText, input);
  assert.equal(done.scramblingText, '');
  assert.equal(done.fullText, input);
});
