import type {
  AskResponse,
  DocumentAnalysis,
  Language,
  RiskSeverity,
} from '../types/document';

export interface LanguageMeta {
  code: Language;
  nativeLabel: string;
  englishName: string;
  speechLang: string;
}

export const LANGUAGE_CONFIG: Record<Language, LanguageMeta> = {
  en: {
    code: 'en',
    nativeLabel: 'English',
    englishName: 'English',
    speechLang: 'en-IN',
  },
  hi: {
    code: 'hi',
    nativeLabel: 'हिन्दी',
    englishName: 'Hindi',
    speechLang: 'hi-IN',
  },
};

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

export const MAX_PAGES = 5;
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export const PREVIEW_ZOOM_LEVELS = [100, 150, 200, 250, 300] as const;
export type PreviewZoomLevel = (typeof PREVIEW_ZOOM_LEVELS)[number];
export const DEFAULT_PREVIEW_ZOOM: PreviewZoomLevel = 100;

export function clampPreviewZoom(value: number): PreviewZoomLevel {
  if (!Number.isFinite(value)) return DEFAULT_PREVIEW_ZOOM;
  let closest: PreviewZoomLevel = DEFAULT_PREVIEW_ZOOM;
  let minDiff = Infinity;
  for (const level of PREVIEW_ZOOM_LEVELS) {
    const diff = Math.abs(level - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }
  return closest;
}

export function stepPreviewZoom(
  current: PreviewZoomLevel,
  direction: 'in' | 'out'
): PreviewZoomLevel {
  const idx = PREVIEW_ZOOM_LEVELS.indexOf(current);
  const safeIdx = idx === -1 ? 0 : idx;
  if (direction === 'in') {
    return PREVIEW_ZOOM_LEVELS[Math.min(PREVIEW_ZOOM_LEVELS.length - 1, safeIdx + 1)];
  }
  return PREVIEW_ZOOM_LEVELS[Math.max(0, safeIdx - 1)];
}

export interface FileValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export function formatPreviewAltText(
  filename: string,
  pageNumber: number,
  totalPages?: number,
  language: Language = 'en'
): string {
  const leaf = filename.split(/[/\\]/).pop() ?? '';
  const withoutExt = leaf.replace(/\.[^/.]+$/, '');
  const spaced = withoutExt
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const label = spaced
    ? spaced
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : language === 'hi'
      ? 'अपलोड किया गया दस्तावेज़'
      : 'Uploaded Document';

  if (language === 'hi') {
    const pageSuffix =
      totalPages && totalPages > 1 ? `पेज ${pageNumber} / ${totalPages}` : `पेज ${pageNumber}`;
    return `${label} का प्रीव्यू (${pageSuffix})`;
  }

  const pageSuffix =
    totalPages && totalPages > 1 ? `page ${pageNumber} of ${totalPages}` : `page ${pageNumber}`;
  return `Document preview of ${label} (${pageSuffix})`;
}

export function validateDocumentFiles(
  files: Array<{ name: string; type: string; size: number }>,
  existingCount = 0
): FileValidationResult {
  if (files.length === 0) {
    return { valid: false, errorMessage: 'Please select at least one document image or PDF.' };
  }
  if (existingCount + files.length > MAX_PAGES) {
    return {
      valid: false,
      errorMessage: `You can attach up to ${MAX_PAGES} pages at a time.`,
    };
  }
  for (const file of files) {
    const normalizedType = file.type.toLowerCase();
    const isPdfByExt = file.name.toLowerCase().endsWith('.pdf') && normalizedType === '';
    if (!ALLOWED_MIME_TYPES.has(normalizedType) && !isPdfByExt) {
      return {
        valid: false,
        errorMessage: `"${file.name}" is not a supported file. Please use JPG, PNG, or PDF.`,
      };
    }
    if (file.size <= 0) {
      return {
        valid: false,
        errorMessage: `"${file.name}" appears to be empty. Please choose another file.`,
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        errorMessage: `"${file.name}" is larger than 8 MB. Please upload a smaller image or PDF.`,
      };
    }
  }
  return { valid: true };
}

export function verifyFileSignature(bytes: Uint8Array, mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mime === 'application/pdf') {
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  }
  return false;
}

export function stripImageMetadata(bytes: Uint8Array, mimeType: string): Uint8Array {
  const mime = mimeType.toLowerCase();
  if (mime === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const chunks: Uint8Array[] = [bytes.slice(0, 2)];
    let offset = 2;
    while (offset + 1 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) {
        chunks.push(bytes.slice(offset));
        break;
      }
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
        chunks.push(bytes.slice(offset, offset + 2));
        offset += 2;
        continue;
      }
      if (offset + 3 >= bytes.length) break;
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segLen < 2 || offset + 2 + segLen > bytes.length) break;
      const isMetadataMarker = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
      if (!isMetadataMarker) {
        chunks.push(bytes.slice(offset, offset + 2 + segLen));
      }
      offset += 2 + segLen;
    }
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }

  if (mime === 'image/png' && bytes.length >= 8) {
    const strippedTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
    const chunks: Uint8Array[] = [bytes.slice(0, 8)];
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length =
        ((bytes[offset] << 24) >>> 0) +
        (bytes[offset + 1] << 16) +
        (bytes[offset + 2] << 8) +
        bytes[offset + 3];
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > bytes.length) break;
      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );
      if (!strippedTypes.has(type)) {
        chunks.push(bytes.slice(offset, chunkEnd));
      }
      offset = chunkEnd;
      if (type === 'IEND') break;
    }
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }

  return bytes;
}

function normalizeSeverity(value: unknown): RiskSeverity {
  if (typeof value !== 'string') return 'medium';
  const lower = value.trim().toLowerCase();
  if (lower === 'high' || lower === 'medium' || lower === 'low') {
    return lower;
  }
  return 'medium';
}

const MAX_ITEMS_PER_LIST = 20;

function cleanString(value: unknown, fallback = '', maxLen = 400): string {
  if (typeof value !== 'string') return fallback;
  const sanitized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (!sanitized) return fallback;
  return sanitized.length > maxLen ? `${sanitized.slice(0, maxLen - 1)}…` : sanitized;
}

export function stripMarkdownCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    return fenced[1].trim();
  }
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1).trim();
    }
  }
  return trimmed;
}

export function parseAndValidateAnalysis(rawJson: string): DocumentAnalysis {
  const cleaned = stripMarkdownCodeFence(rawJson);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the document summary. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Document summary was empty. Please try again.');
  }

  const obj = parsed as Record<string, unknown>;
  const readable = obj.readable === false ? false : true;
  const unreadableReason = cleanString(obj.unreadableReason, '', 400);

  if (!readable) {
    return {
      readable: false,
      unreadableReason:
        unreadableReason ||
        'This photo is too blurry, dark, or cropped to read reliably. Please take a clearer photo in bright light.',
      type: cleanString(obj.type, 'Unreadable document', 120),
      summary: '',
      deadlines: [],
      money: [],
      risks: [],
      steps: [],
    };
  }

  const type = cleanString(obj.type, '', 120);
  const summary = cleanString(obj.summary, '', 1400);
  if (!type || !summary) {
    throw new Error('The image did not contain enough readable text. Please retake the photo.');
  }

  const deadlines = Array.isArray(obj.deadlines)
    ? obj.deadlines
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .slice(0, MAX_ITEMS_PER_LIST)
        .map((item) => ({
          when: cleanString(item.when, 'Not specified', 120),
          what: cleanString(item.what, '', 200),
          note: cleanString(item.note, '', 350),
        }))
        .filter((item) => item.what.length > 0)
    : [];

  const money = Array.isArray(obj.money)
    ? obj.money
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .slice(0, MAX_ITEMS_PER_LIST)
        .map((item) => ({
          label: cleanString(item.label, '', 140),
          amount: cleanString(item.amount, 'Not stated', 100),
          note: cleanString(item.note, '', 350),
        }))
        .filter((item) => item.label.length > 0)
    : [];

  const risks = Array.isArray(obj.risks)
    ? obj.risks
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .slice(0, MAX_ITEMS_PER_LIST)
        .map((item) => ({
          sev: normalizeSeverity(item.sev),
          clause: cleanString(item.clause, 'General terms', 140),
          text: cleanString(item.text, '', 500),
        }))
        .filter((item) => item.text.length > 0)
    : [];

  const steps = Array.isArray(obj.steps)
    ? obj.steps
        .slice(0, MAX_ITEMS_PER_LIST)
        .map((step) => cleanString(step, '', 350))
        .filter((step) => step.length > 0)
    : [];

  return {
    readable: true,
    type,
    summary,
    deadlines,
    money,
    risks,
    steps,
  };
}

export function parseAndValidateAskResponse(rawJson: string): AskResponse {
  const cleaned = stripMarkdownCodeFence(rawJson);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not read the answer cleanly. Please ask again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Received an empty answer.');
  }

  const obj = parsed as Record<string, unknown>;
  const answer = cleanString(obj.answer, '', 1200);
  if (!answer) {
    throw new Error('No answer text was returned.');
  }

  return {
    answer,
    citedClause: cleanString(obj.citedClause, '', 160) || undefined,
    notInDocument: Boolean(obj.notInDocument),
  };
}

export function buildSpeechScript(analysis: DocumentAnalysis, language: Language): string {
  const parts: string[] = [analysis.type, analysis.summary];

  if (analysis.risks.length > 0) {
    const riskIntro = language === 'hi' ? 'मुख्य जोखिम:' : 'Key risks to watch:';
    parts.push(riskIntro);
    for (const risk of analysis.risks.slice(0, 2)) {
      parts.push(`${risk.clause}. ${risk.text}`);
    }
  }

  if (analysis.steps.length > 0) {
    const stepIntro = language === 'hi' ? 'अगला कदम:' : 'First next step:';
    parts.push(`${stepIntro} ${analysis.steps[0]}`);
  }

  return parts.filter(Boolean).join('. ');
}

export function answerDemoQuestion(question: string, language: Language): AskResponse {
  const q = question.toLowerCase();

  const matchesDeposit =
    /deposit|security|refund|deduct|paint|repair|cut|1,80,000|180000|डिपॉजिट|जमा|वापस|कटौती/.test(
      q
    );
  const matchesLateOrRent =
    /rent|late|fee|penalty|500|30,000|30000|5th|due|किराया|देर|जुर्माना/.test(q);
  const matchesTerminationOrLockIn =
    /leave|exit|notice|terminat|lock-in|lock in|15 day|60 day|6 month|11 month|नोटिस|खाली|छोड़|लॉक/.test(
      q
    );
  const matchesRenewal =
    /renew|hike|increase|10%|october|2027|बढ़ोतरी|नवीनीकरण/.test(q);

  if (matchesDeposit) {
    const answers: Record<Language, AskResponse> = {
      en: {
        answer:
          'You paid a Rs 1,80,000 security deposit (6 months rent), which is refundable without interest when you leave. However, Clause 12 lets the landlord deduct painting, cleaning, and repair costs at their sole discretion without showing bills, and Clause 9 lets them cut 2 months rent if you leave without 60 days written notice.',
        citedClause: 'Clause 9 & Clause 12',
        notInDocument: false,
      },
      hi: {
        answer:
          'आपने 1,80,000 रुपये (6 महीने का किराया) सिक्योरिटी डिपॉजिट दिया है, जो घर छोड़ने पर बिना ब्याज वापस मिलना है। लेकिन क्लॉज 12 के तहत मकान मालिक बिना बिल दिखाए अपनी मर्जी से पेंटिंग और मरम्मत का पैसा काट सकता है, और 60 दिन के नोटिस बिना छोड़ने पर 2 महीने का किराया कट जाएगा।',
        citedClause: 'क्लॉज 9 और क्लॉज 12',
        notInDocument: false,
      },
    };
    return answers[language];
  }

  if (matchesTerminationOrLockIn) {
    const answers: Record<Language, AskResponse> = {
      en: {
        answer:
          'This is an 11-month agreement ending on 31 October 2027. You have a 6-month minimum lock-in and must give 60 days written notice to leave, whereas the landlord can end the lease with only 15 days notice under Clause 9.',
        citedClause: 'Clause 9 · Termination Notice',
        notInDocument: false,
      },
      hi: {
        answer:
          'यह 11 महीने का समझौता है जो 31 अक्टूबर 2027 को खत्म होगा। आपके लिए 6 महीने का लॉक-इन और 60 दिन का लिखित नोटिस जरूरी है, जबकि क्लॉज 9 में मकान मालिक सिर्फ 15 दिन के नोटिस पर समझौता खत्म कर सकता है।',
        citedClause: 'क्लॉज 9 · समझौता समाप्ति नोटिस',
        notInDocument: false,
      },
    };
    return answers[language];
  }

  if (matchesLateOrRent) {
    const answers: Record<Language, AskResponse> = {
      en: {
        answer:
          'The monthly rent is Rs 30,000, due by the 5th of each month. If you pay after the 7th, Clause 6 charges a late fee of Rs 500 per day with no upper limit.',
        citedClause: 'Clause 6 · Late Rent Penalty',
        notInDocument: false,
      },
      hi: {
        answer:
          'मासिक किराया 30,000 रुपये है जिसे हर महीने की 5 तारीख तक देना है। 7 तारीख के बाद भुगतान करने पर क्लॉज 6 के तहत हर दिन 500 रुपये लेट फीस लगेगी, जिसकी कोई अधिकतम सीमा नहीं है।',
        citedClause: 'क्लॉज 6 · लेट किराया जुर्माना',
        notInDocument: false,
      },
    };
    return answers[language];
  }

  if (matchesRenewal) {
    const answers: Record<Language, AskResponse> = {
      en: {
        answer:
          'Under Clause 14, if you renew after the 11-month term ends on 31 October 2027, the monthly rent automatically increases by 10% (to Rs 33,000) unless both sides agree in writing to a different rate.',
        citedClause: 'Clause 14 · Renewal Terms',
        notInDocument: false,
      },
      hi: {
        answer:
          'क्लॉज 14 के मुताबिक, 31 अक्टूबर 2027 को 11 महीने पूरे होने के बाद अगर आप समझौता आगे बढ़ाते हैं, तो किराया अपने-आप 10% (33,000 रुपये) बढ़ जाएगा।',
        citedClause: 'क्लॉज 14 · नवीनीकरण शर्तें',
        notInDocument: false,
      },
    };
    return answers[language];
  }

  const missingResponses: Record<Language, AskResponse> = {
    en: {
      answer:
        'This rental agreement does not say anything about that. It only covers the 11-month term, Rs 30,000 monthly rent, Rs 1,80,000 deposit, late fees, notice periods, deposit deductions, and renewal.',
      notInDocument: true,
    },
    hi: {
      answer:
        'इस किराया समझौते में इस बारे में कुछ नहीं लिखा है। इसमें केवल 11 महीने की अवधि, 30,000 रुपये किराया, 1,80,000 रुपये डिपॉजिट, लेट फीस, नोटिस समय और नवीनीकरण का जिक्र है।',
      notInDocument: true,
    },
  };
  return missingResponses[language];
}
