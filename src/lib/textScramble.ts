export const SCRAMBLE_GLYPHS_LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&$*+=';
export const SCRAMBLE_GLYPHS_DEVANAGARI = 'अआइईउऊएऐओऔकखगघचछजझटठडढतथदधनपफबभमयरलवशषसह';

const PRESERVED_CHAR_RE = /^[\s.,!?·:;()[\]{}/\\\-–—'"‘’“”।]+$/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

export interface ScrambleFrame {
  resolvedCount: number;
  resolvedText: string;
  scramblingText: string;
  trailingText: string;
  fullText: string;
  settled: boolean;
}

export function segmentGraphemes(text: string): string[] {
  if (!text) return [];
  const IntlWithSegmenter = Intl as unknown as {
    Segmenter?: new (
      locale?: string,
      options?: { granularity: 'grapheme' | 'word' | 'sentence' }
    ) => { segment: (input: string) => Iterable<{ segment: string }> };
  };

  if (typeof IntlWithSegmenter.Segmenter === 'function') {
    const segmenter = new IntlWithSegmenter.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

export function selectGlyphPool(text: string): string {
  return DEVANAGARI_RE.test(text) ? SCRAMBLE_GLYPHS_DEVANAGARI : SCRAMBLE_GLYPHS_LATIN;
}

function pickGlyph(index: number, step: number, seed: number, pool: string): string {
  const hash = Math.abs((index * 31 + step * 17 + seed * 13) ^ (step << 3));
  return pool.charAt(hash % pool.length) || '*';
}

export function computeScrambleFrame(
  graphemes: string[],
  progress: number,
  step: number,
  glyphPool: string,
  seed = 7
): ScrambleFrame {
  const total = graphemes.length;
  if (total === 0) {
    return {
      resolvedCount: 0,
      resolvedText: '',
      scramblingText: '',
      trailingText: '',
      fullText: '',
      settled: true,
    };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped >= 1) {
    const fullText = graphemes.join('');
    return {
      resolvedCount: total,
      resolvedText: fullText,
      scramblingText: '',
      trailingText: '',
      fullText,
      settled: true,
    };
  }

  // Smooth ease-out curve for crisp deceleration as final letters lock in
  const eased = 1 - Math.pow(1 - clamped, 1.6);
  const resolvedCount = Math.min(total, Math.floor(eased * total));
  const waveWidth = Math.max(3, Math.min(8, Math.ceil(total * 0.25)));
  const waveEnd = Math.min(total, resolvedCount + waveWidth);

  const resolvedText = graphemes.slice(0, resolvedCount).join('');
  let scramblingText = '';
  for (let i = resolvedCount; i < waveEnd; i += 1) {
    const g = graphemes[i];
    scramblingText += PRESERVED_CHAR_RE.test(g) ? g : pickGlyph(i, step, seed, glyphPool);
  }

  let trailingText = '';
  for (let i = waveEnd; i < total; i += 1) {
    const g = graphemes[i];
    trailingText += PRESERVED_CHAR_RE.test(g) ? g : pickGlyph(i, step + 5, seed + 19, glyphPool);
  }

  return {
    resolvedCount,
    resolvedText,
    scramblingText,
    trailingText,
    fullText: `${resolvedText}${scramblingText}${trailingText}`,
    settled: false,
  };
}
