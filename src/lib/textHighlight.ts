import { segmentGraphemes } from './textScramble';

export type HighlightKind = 'plain' | 'phrase' | 'amount' | 'deadline' | 'risk';

export interface HighlightSegment {
  text: string;
  kind: HighlightKind;
}

export interface HighlightOptions {
  words?: string[];
  autoDetectDocumentTerms?: boolean;
}

const ASCII_WORD_CHAR_RE = /^[A-Za-z0-9]$/;

interface PatternRule {
  kind: Exclude<HighlightKind, 'plain' | 'phrase'>;
  regex: RegExp;
}

const DOCUMENT_TERM_RULES: PatternRule[] = [
  {
    kind: 'risk',
    regex:
      /\b(?:sole discretion|without sharing receipts|without showing bills|without giving a reason|no upper limit|no maximum cap|one-sided|high risk|late fee|interest-free|lock-in)\b|(?:बिना कारण बताए|बिना रसीद दिखाए|बिना पक्का बिल दिखाए|अपनी मर्जी से|एकतरफा|कोई ऊपरी सीमा नहीं|अधिकतम सीमा नहीं|लॉक-इन|लेट फीस|जुर्माना|बिना ब्याज|बड़ा जोखिम)/gi,
  },
  {
    kind: 'amount',
    regex:
      /(?:₹|Rs\.?)\s*\d[\d,]*(?:\.\d+)?(?:\s*\/\s*(?:day|month|year))?|\d[\d,]*(?:\.\d+)?\s*(?:रुपये|रु\.?)(?:\s*\/\s*(?:दिन|महीना))?|[+-]?\d+(?:\.\d+)?%/gi,
  },
  {
    kind: 'deadline',
    regex:
      /\b\d{1,2}(?:st|nd|rd|th)\s+of\s+(?:every|the)\s+month\b|\b\d{1,2}(?:st|nd|rd|th)\b|\b\d+\s*(?:days?|months?|years?)\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b|\d+\s*(?:तारीख|दिन|महीने|साल)|\d{1,2}\s+(?:जनवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)\s+\d{4}/gi,
  },
];

function isAsciiWordBoundary(text: string, start: number, end: number, phrase: string): boolean {
  const first = phrase.charAt(0);
  const last = phrase.charAt(phrase.length - 1);

  if (ASCII_WORD_CHAR_RE.test(first) && start > 0) {
    if (ASCII_WORD_CHAR_RE.test(text.charAt(start - 1))) return false;
  }
  if (ASCII_WORD_CHAR_RE.test(last) && end < text.length) {
    if (ASCII_WORD_CHAR_RE.test(text.charAt(end))) return false;
  }
  return true;
}

interface SpanMatch {
  start: number;
  end: number;
  kind: Exclude<HighlightKind, 'plain'>;
  priority: number;
}

export function splitHighlightSegments(
  text: string,
  options: HighlightOptions = {}
): HighlightSegment[] {
  if (!text) return [];

  const { words = [], autoDetectDocumentTerms = false } = options;
  const candidates: SpanMatch[] = [];

  const cleanedWords = [...new Set(words.map((w) => w.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );

  if (cleanedWords.length > 0) {
    const lowerText = text.toLowerCase();
    for (const phrase of cleanedWords) {
      const lowerPhrase = phrase.toLowerCase();
      let offset = 0;
      while (offset < lowerText.length) {
        const idx = lowerText.indexOf(lowerPhrase, offset);
        if (idx === -1) break;
        const end = idx + phrase.length;
        if (isAsciiWordBoundary(text, idx, end, phrase)) {
          candidates.push({ start: idx, end, kind: 'phrase', priority: 4 });
        }
        offset = idx + Math.max(1, phrase.length);
      }
    }
  }

  if (autoDetectDocumentTerms) {
    for (const rule of DOCUMENT_TERM_RULES) {
      const priority = rule.kind === 'risk' ? 3 : rule.kind === 'amount' ? 2 : 1;
      const re = new RegExp(rule.regex.source, rule.regex.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        if (!match[0]) break;
        candidates.push({
          start: match.index,
          end: match.index + match[0].length,
          kind: rule.kind,
          priority,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return [{ text, kind: 'plain' }];
  }

  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.end - b.start - (a.end - a.start);
  });

  const accepted: SpanMatch[] = [];
  let cursor = 0;
  for (const item of candidates) {
    if (item.start < cursor) continue;
    accepted.push(item);
    cursor = item.end;
  }

  const segments: HighlightSegment[] = [];
  let pos = 0;
  for (const span of accepted) {
    if (span.start > pos) {
      segments.push({ text: text.slice(pos, span.start), kind: 'plain' });
    }
    segments.push({ text: text.slice(span.start, span.end), kind: span.kind });
    pos = span.end;
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), kind: 'plain' });
  }

  return segments;
}

export function computeGraphemeHighlightMask(
  graphemes: string[],
  highlightWords?: string[]
): boolean[] {
  const mask = new Array<boolean>(graphemes.length).fill(false);
  if (graphemes.length === 0 || !highlightWords || highlightWords.length === 0) {
    return mask;
  }

  const fullText = graphemes.join('');
  const segments = splitHighlightSegments(fullText, { words: highlightWords });
  if (segments.length <= 1 && segments[0]?.kind === 'plain') {
    return mask;
  }

  const charToGrapheme = new Array<number>(fullText.length).fill(0);
  let charPos = 0;
  for (let gIdx = 0; gIdx < graphemes.length; gIdx += 1) {
    const gLen = graphemes[gIdx].length;
    for (let k = 0; k < gLen; k += 1) {
      charToGrapheme[charPos + k] = gIdx;
    }
    charPos += gLen;
  }

  let segCharStart = 0;
  for (const seg of segments) {
    const segCharEnd = segCharStart + seg.text.length;
    if (seg.kind !== 'plain') {
      for (let c = segCharStart; c < segCharEnd; c += 1) {
        mask[charToGrapheme[c]] = true;
      }
    }
    segCharStart = segCharEnd;
  }

  return mask;
}

export function groupHighlightedRuns(
  graphemes: string[],
  mask: boolean[]
): Array<{ text: string; highlighted: boolean }> {
  if (graphemes.length === 0) return [];
  const runs: Array<{ text: string; highlighted: boolean }> = [];
  let currentHighlight = Boolean(mask[0]);
  let buffer = graphemes[0];

  for (let i = 1; i < graphemes.length; i += 1) {
    const nextHighlight = Boolean(mask[i]);
    if (nextHighlight === currentHighlight) {
      buffer += graphemes[i];
    } else {
      runs.push({ text: buffer, highlighted: currentHighlight });
      currentHighlight = nextHighlight;
      buffer = graphemes[i];
    }
  }
  runs.push({ text: buffer, highlighted: currentHighlight });
  return runs;
}

export function extractGraphemeSliceHighlight(
  text: string,
  highlightWords?: string[]
): Array<{ text: string; highlighted: boolean }> {
  const graphemes = segmentGraphemes(text);
  const mask = computeGraphemeHighlightMask(graphemes, highlightWords);
  return groupHighlightedRuns(graphemes, mask);
}
