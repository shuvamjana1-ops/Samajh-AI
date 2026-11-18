import type { DocumentAnalysis, Language } from '../types/document';

export interface EnvValidationResult {
  port: number;
  appUrl?: string;
  allowIndexing: boolean;
  aiProvider: 'auto' | 'gemini' | 'groq' | 'openrouter' | 'ollama';
  geminiModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  geminiConfigured: boolean;
  groqConfigured: boolean;
  openrouterConfigured: boolean;
  ollamaBaseUrl?: string;
  anyAiConfigured: boolean;
  disablePaidAi: boolean;
  aiDailyGlobalLimit: number;
  aiDailyIpLimit: number;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const MAX_ITEMS_PER_LIST = 20;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function hasOnlyAllowedKeys(
  obj: Record<string, unknown>,
  allowedKeys: readonly string[]
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(obj).every((key) => allowed.has(key));
}

export function validateEnvConfig(
  env: Record<string, string | undefined>,
  isProd: boolean
): EnvValidationResult {
  const rawPort = env.PORT?.trim();
  let port = 3000;
  if (rawPort) {
    if (!/^\d+$/.test(rawPort)) {
      throw new Error('Server configuration error: invalid environment settings.');
    }
    const parsed = Number(rawPort);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('Server configuration error: invalid environment settings.');
    }
    port = parsed;
  }

  const rawAppUrl = env.APP_URL?.trim();
  let appUrl: string | undefined;
  if (rawAppUrl && rawAppUrl !== 'MY_APP_URL') {
    try {
      const parsedUrl = new URL(rawAppUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('INVALID_APP_URL');
      }
      appUrl = parsedUrl.origin;
    } catch {
      throw new Error('Server configuration error: invalid environment settings.');
    }
  }

  const rawIndexing = env.ALLOW_INDEXING?.trim();
  if (rawIndexing && rawIndexing !== 'true' && rawIndexing !== 'false') {
    throw new Error('Server configuration error: invalid environment settings.');
  }

  const rawDisablePaidAi = env.DISABLE_PAID_AI?.trim();
  if (rawDisablePaidAi && rawDisablePaidAi !== 'true' && rawDisablePaidAi !== 'false') {
    throw new Error('Server configuration error: invalid environment settings.');
  }

  const parsePositiveIntLimit = (raw: string | undefined, fallback: number, max: number): number => {
    const trimmed = raw?.trim();
    if (!trimmed) return fallback;
    if (!/^\d+$/.test(trimmed)) {
      throw new Error('Server configuration error: invalid environment settings.');
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
      throw new Error('Server configuration error: invalid environment settings.');
    }
    return parsed;
  };

  const aiDailyGlobalLimit = parsePositiveIntLimit(env.AI_DAILY_GLOBAL_LIMIT, 500, 100000);
  const aiDailyIpLimit = parsePositiveIntLimit(env.AI_DAILY_IP_LIMIT, 30, 10000);

  const rawAiProvider = env.AI_PROVIDER?.trim().toLowerCase() || 'auto';
  if (
    rawAiProvider !== 'auto' &&
    rawAiProvider !== 'gemini' &&
    rawAiProvider !== 'groq' &&
    rawAiProvider !== 'openrouter' &&
    rawAiProvider !== 'ollama'
  ) {
    throw new Error('Server configuration error: invalid environment settings.');
  }

  const rawGeminiModel = env.GEMINI_MODEL?.trim() || 'gemini-4-hydrogen';
  if (rawGeminiModel !== 'gemini-4-hydrogen' && rawGeminiModel !== 'gemini-3.1-flash-lite') {
    throw new Error('Server configuration error: invalid environment settings.');
  }

  const rawGemini = env.GEMINI_API_KEY?.trim();
  const geminiConfigured = Boolean(rawGemini && rawGemini !== 'MY_GEMINI_API_KEY');

  const rawGroq = env.GROQ_API_KEY?.trim();
  const groqConfigured = Boolean(rawGroq && rawGroq !== 'MY_GROQ_API_KEY');

  const rawOpenrouter = env.OPENROUTER_API_KEY?.trim();
  const openrouterConfigured = Boolean(rawOpenrouter && rawOpenrouter !== 'MY_OPENROUTER_API_KEY');

  const rawOllamaUrl = env.OLLAMA_BASE_URL?.trim();
  let ollamaBaseUrl: string | undefined;
  if (rawOllamaUrl) {
    try {
      const parsedOllama = new URL(rawOllamaUrl);
      if (parsedOllama.protocol !== 'http:' && parsedOllama.protocol !== 'https:') {
        throw new Error('INVALID_OLLAMA_URL');
      }
      ollamaBaseUrl = parsedOllama.origin;
    } catch {
      throw new Error('Server configuration error: invalid environment settings.');
    }
  }

  const anyAiConfigured =
    geminiConfigured || groqConfigured || openrouterConfigured || Boolean(ollamaBaseUrl);
  const isVercelServerless = env.VERCEL === '1';
  if (isProd && !anyAiConfigured && !isVercelServerless) {
    throw new Error('Server configuration error: missing required environment variables.');
  }

  return {
    port,
    appUrl,
    allowIndexing: rawIndexing === 'true',
    aiProvider: rawAiProvider,
    geminiModel: rawGeminiModel,
    geminiConfigured,
    groqConfigured,
    openrouterConfigured,
    ollamaBaseUrl,
    anyAiConfigured,
    disablePaidAi: rawDisablePaidAi === 'true',
    aiDailyGlobalLimit,
    aiDailyIpLimit,
  };
}

export class DailyQuotaTracker {
  private dayKey = '';
  private globalCount = 0;
  private readonly ipCounts = new Map<string, number>();

  constructor(
    private readonly globalLimit: number,
    private readonly ipLimit: number,
    private readonly maxTrackedIps = 10000
  ) {}

  private resetIfNewDay(nowMs: number): string {
    const today = new Date(nowMs).toISOString().slice(0, 10);
    if (today !== this.dayKey) {
      this.dayKey = today;
      this.globalCount = 0;
      this.ipCounts.clear();
    }
    return today;
  }

  private secondsUntilUtcMidnight(nowMs: number): number {
    const now = new Date(nowMs);
    const nextMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0
    );
    return Math.max(1, Math.ceil((nextMidnight - nowMs) / 1000));
  }

  consume(
    rawIp: string,
    nowMs = Date.now()
  ): { ok: true } | { ok: false; scope: 'global' | 'ip'; retryAfterSeconds: number } {
    this.resetIfNewDay(nowMs);
    const ip = rawIp.trim() || 'unknown';
    const currentIpCount = this.ipCounts.get(ip) ?? 0;

    if (currentIpCount >= this.ipLimit) {
      return {
        ok: false,
        scope: 'ip',
        retryAfterSeconds: this.secondsUntilUtcMidnight(nowMs),
      };
    }

    if (this.globalCount >= this.globalLimit) {
      return {
        ok: false,
        scope: 'global',
        retryAfterSeconds: this.secondsUntilUtcMidnight(nowMs),
      };
    }

    if (!this.ipCounts.has(ip) && this.ipCounts.size >= this.maxTrackedIps) {
      const oldestKey = this.ipCounts.keys().next().value;
      if (oldestKey !== undefined) {
        this.ipCounts.delete(oldestKey);
      }
    }

    this.ipCounts.set(ip, currentIpCount + 1);
    this.globalCount += 1;
    return { ok: true };
  }
}

function validateLanguageField(
  value: unknown,
  required: boolean
): ValidationResult<Language> {
  if (value === undefined) {
    return required
      ? { ok: false, error: 'Please select English or Hindi.' }
      : { ok: true, data: 'en' };
  }
  if (value === 'en' || value === 'hi') {
    return { ok: true, data: value };
  }
  return { ok: false, error: 'Unsupported language selection.' };
}

function validateNonEmptyBoundedString(
  value: unknown,
  maxLen: number,
  fieldError: string
): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { ok: false, error: fieldError };
  }
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (!cleaned || cleaned.length > maxLen) {
    return { ok: false, error: fieldError };
  }
  return { ok: true, data: cleaned };
}

function validateBoundedString(
  value: unknown,
  maxLen: number,
  fieldError: string
): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { ok: false, error: fieldError };
  }
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (cleaned.length > maxLen) {
    return { ok: false, error: fieldError };
  }
  return { ok: true, data: cleaned };
}

export function validateAnalysisInput(value: unknown): ValidationResult<DocumentAnalysis> {
  const invalidMsg = 'Valid document summary is required.';
  if (!isPlainObject(value)) {
    return { ok: false, error: invalidMsg };
  }
  if (
    !hasOnlyAllowedKeys(value, [
      'readable',
      'unreadableReason',
      'type',
      'summary',
      'deadlines',
      'money',
      'risks',
      'steps',
    ])
  ) {
    return { ok: false, error: 'Unexpected fields in document summary.' };
  }
  if (typeof value.readable !== 'boolean') {
    return { ok: false, error: invalidMsg };
  }

  let unreadableReason: string | undefined;
  if (value.unreadableReason !== undefined) {
    const ur = validateBoundedString(value.unreadableReason, 500, invalidMsg);
    if (!ur.ok) return ur;
    unreadableReason = ur.data;
  }

  const typeRes = validateNonEmptyBoundedString(value.type, 160, invalidMsg);
  if (!typeRes.ok) return typeRes;

  const summaryRes = validateBoundedString(value.summary, 2000, invalidMsg);
  if (!summaryRes.ok) return summaryRes;
  if (value.readable && !summaryRes.data) {
    return { ok: false, error: invalidMsg };
  }

  if (
    !Array.isArray(value.deadlines) ||
    !Array.isArray(value.money) ||
    !Array.isArray(value.risks) ||
    !Array.isArray(value.steps)
  ) {
    return { ok: false, error: invalidMsg };
  }
  if (
    value.deadlines.length > MAX_ITEMS_PER_LIST ||
    value.money.length > MAX_ITEMS_PER_LIST ||
    value.risks.length > MAX_ITEMS_PER_LIST ||
    value.steps.length > MAX_ITEMS_PER_LIST
  ) {
    return { ok: false, error: 'Document summary exceeds maximum item limit.' };
  }

  const deadlines: DocumentAnalysis['deadlines'] = [];
  for (const item of value.deadlines) {
    if (!isPlainObject(item) || !hasOnlyAllowedKeys(item, ['when', 'what', 'note'])) {
      return { ok: false, error: invalidMsg };
    }
    const when = validateBoundedString(item.when, 160, invalidMsg);
    const what = validateNonEmptyBoundedString(item.what, 300, invalidMsg);
    const note = validateBoundedString(item.note, 500, invalidMsg);
    if (!when.ok || !what.ok || !note.ok) return { ok: false, error: invalidMsg };
    deadlines.push({ when: when.data, what: what.data, note: note.data });
  }

  const money: DocumentAnalysis['money'] = [];
  for (const item of value.money) {
    if (!isPlainObject(item) || !hasOnlyAllowedKeys(item, ['label', 'amount', 'note'])) {
      return { ok: false, error: invalidMsg };
    }
    const label = validateNonEmptyBoundedString(item.label, 200, invalidMsg);
    const amount = validateBoundedString(item.amount, 140, invalidMsg);
    const note = validateBoundedString(item.note, 500, invalidMsg);
    if (!label.ok || !amount.ok || !note.ok) return { ok: false, error: invalidMsg };
    money.push({ label: label.data, amount: amount.data, note: note.data });
  }

  const risks: DocumentAnalysis['risks'] = [];
  for (const item of value.risks) {
    if (!isPlainObject(item) || !hasOnlyAllowedKeys(item, ['sev', 'clause', 'text'])) {
      return { ok: false, error: invalidMsg };
    }
    if (item.sev !== 'low' && item.sev !== 'medium' && item.sev !== 'high') {
      return { ok: false, error: invalidMsg };
    }
    const clause = validateBoundedString(item.clause, 200, invalidMsg);
    const text = validateNonEmptyBoundedString(item.text, 700, invalidMsg);
    if (!clause.ok || !text.ok) return { ok: false, error: invalidMsg };
    risks.push({ sev: item.sev, clause: clause.data, text: text.data });
  }

  const steps: string[] = [];
  for (const step of value.steps) {
    const s = validateNonEmptyBoundedString(step, 500, invalidMsg);
    if (!s.ok) return { ok: false, error: invalidMsg };
    steps.push(s.data);
  }

  return {
    ok: true,
    data: {
      readable: value.readable,
      ...(unreadableReason !== undefined ? { unreadableReason } : {}),
      type: typeRes.data,
      summary: summaryRes.data,
      deadlines,
      money,
      risks,
      steps,
    },
  };
}

export interface ValidContactInput {
  name: string;
  email: string;
  message: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

export function validateContactBody(body: unknown): ValidationResult<ValidContactInput> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Invalid request body.' };
  }
  if (!hasOnlyAllowedKeys(body, ['name', 'email', 'message', 'website', 'utm'])) {
    return { ok: false, error: 'Unexpected fields in contact request.' };
  }
  if (body.website !== undefined && typeof body.website !== 'string') {
    return { ok: false, error: 'Unable to send message right now.' };
  }
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return { ok: false, error: 'Unable to send message right now.' };
  }

  if (typeof body.name !== 'string') {
    return { ok: false, error: 'Please enter your name (2 to 120 characters).' };
  }
  const name = body.name.replace(/[\u0000-\u001F]/g, '').trim();
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: 'Please enter your name (2 to 120 characters).' };
  }

  if (typeof body.email !== 'string') {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  const email = body.email.trim();
  if (!/^[^\s@<>()[\]\\,;:\s@"]+@[^\s@<>()[\]\\,;:\s@"]+\.[^\s@<>()[\]\\,;:\s@"]{2,}$/.test(email) || email.length > 254) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  if (typeof body.message !== 'string') {
    return { ok: false, error: 'Please enter a message (10 to 2000 characters).' };
  }
  const message = body.message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (message.length < 10 || message.length > 2000) {
    return { ok: false, error: 'Please enter a message (10 to 2000 characters).' };
  }

  let utmSource = '';
  let utmMedium = '';
  let utmCampaign = '';
  if (body.utm !== undefined) {
    if (!isPlainObject(body.utm) || !hasOnlyAllowedKeys(body.utm, ['utm_source', 'utm_medium', 'utm_campaign'])) {
      return { ok: false, error: 'Invalid attribution parameters.' };
    }
    for (const [k, v] of Object.entries(body.utm)) {
      if (v !== undefined && typeof v !== 'string') {
        return { ok: false, error: 'Invalid attribution parameters.' };
      }
      if (typeof v === 'string' && v.length > 120) {
        return { ok: false, error: 'Invalid attribution parameters.' };
      }
      const cleanVal = typeof v === 'string' ? v.replace(/[\u0000-\u001F]/g, '').trim().slice(0, 120) : '';
      if (k === 'utm_source') utmSource = cleanVal;
      if (k === 'utm_medium') utmMedium = cleanVal;
      if (k === 'utm_campaign') utmCampaign = cleanVal;
    }
  }

  return {
    ok: true,
    data: { name, email, message, utmSource, utmMedium, utmCampaign },
  };
}

export function validateAnalyzeBody(
  body: unknown
): ValidationResult<{ pages: unknown; language: Language }> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Invalid request body.' };
  }
  if (!hasOnlyAllowedKeys(body, ['pages', 'language'])) {
    return { ok: false, error: 'Unexpected fields in analyze request.' };
  }
  const langRes = validateLanguageField(body.language, false);
  if (!langRes.ok) return langRes;

  if (!Array.isArray(body.pages)) {
    return { ok: false, error: 'Please provide valid document pages.' };
  }
  for (const page of body.pages) {
    if (!isPlainObject(page) || !hasOnlyAllowedKeys(page, ['base64', 'mimeType'])) {
      return { ok: false, error: 'Each page must include only base64 and mimeType.' };
    }
  }

  return {
    ok: true,
    data: { pages: body.pages, language: langRes.data },
  };
}

export function validateTranslateBody(
  body: unknown
): ValidationResult<{ analysis: DocumentAnalysis; targetLanguage: Language }> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Invalid request body.' };
  }
  if (!hasOnlyAllowedKeys(body, ['analysis', 'targetLanguage'])) {
    return { ok: false, error: 'Unexpected fields in translate request.' };
  }
  const langRes = validateLanguageField(body.targetLanguage, true);
  if (!langRes.ok) {
    return { ok: false, error: 'Valid document summary and target language are required.' };
  }
  const analysisRes = validateAnalysisInput(body.analysis);
  if (!analysisRes.ok) {
    return analysisRes;
  }

  return {
    ok: true,
    data: {
      analysis: analysisRes.data,
      targetLanguage: langRes.data,
    },
  };
}

export function validateAskBody(
  body: unknown
): ValidationResult<{
  question: string;
  language: Language;
  analysis: DocumentAnalysis;
  pages?: unknown;
}> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Invalid request body.' };
  }
  if (!hasOnlyAllowedKeys(body, ['question', 'language', 'analysis', 'pages'])) {
    return { ok: false, error: 'Unexpected fields in question request.' };
  }

  const questionRes = validateNonEmptyBoundedString(
    body.question,
    500,
    'Please enter a short question (up to 500 characters).'
  );
  if (!questionRes.ok) return questionRes;

  const langRes = validateLanguageField(body.language, false);
  if (!langRes.ok) return langRes;

  const analysisRes = validateAnalysisInput(body.analysis);
  if (!analysisRes.ok) {
    return { ok: false, error: 'No valid analyzed document found in this session.' };
  }

  if (body.pages !== undefined) {
    if (!Array.isArray(body.pages)) {
      return { ok: false, error: 'Invalid pages format.' };
    }
    for (const page of body.pages) {
      if (!isPlainObject(page) || !hasOnlyAllowedKeys(page, ['base64', 'mimeType'])) {
        return { ok: false, error: 'Each page must include only base64 and mimeType.' };
      }
    }
  }

  return {
    ok: true,
    data: {
      question: questionRes.data,
      language: langRes.data,
      analysis: analysisRes.data,
      pages: body.pages,
    },
  };
}

const SENSITIVE_EXACT_PATHS = new Set([
  '/firebase-applet-config.json',
  '/firebase-applet-config.example.json',
  '/firebase-blueprint.json',
  '/firebase_applet_config.xml',
  '/package.json',
  '/package-lock.json',
  '/bun.lock',
  '/tsconfig.json',
  '/eslint.config.mjs',
  '/vite.config.ts',
  '/firestore.rules',
  '/firestore.rules.test.ts',
  '/server.ts',
  '/metadata.json',
  '/security_spec.md',
  '/security.md',
  '/vercel.json',
  '/readme.md',
]);

function normalizePosixPath(input: string): string {
  const parts = input.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return `/${stack.join('/')}`;
}

export function isBlockedSensitivePath(rawPath: string, isProd: boolean): boolean {
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return true;
  }

  const normalized = normalizePosixPath(decoded.replace(/\\/g, '/').toLowerCase());

  if (!isProd && normalized.startsWith('/node_modules/.vite/')) {
    return false;
  }

  // Block Vite /@fs/ filesystem access except pre-bundled node_modules dependencies in dev
  if (normalized.startsWith('/@fs/')) {
    if (isProd) return true;
    const isNodeModulesAsset =
      /^\/@fs\/.*\/node_modules\/(?!\.vite\/.*\.(?:env|key|pem)).+/.test(normalized) &&
      !/(^|\/)\.[^/]+/.test(normalized) &&
      !/\.(env|sql|bak|zip|tar|gz|tgz|map|rules|log|pem|key|crt|p12)$/i.test(normalized);
    if (!isNodeModulesAsset) {
      return true;
    }
  }

  if (/(^|\/)\.[^/]+/.test(normalized)) {
    return true;
  }
  if (SENSITIVE_EXACT_PATHS.has(normalized)) {
    return true;
  }
  const baseName = normalized.slice(normalized.lastIndexOf('/'));
  if (SENSITIVE_EXACT_PATHS.has(baseName)) {
    return true;
  }
  if (/\.(env|sql|bak|zip|tar|gz|tgz|map|rules|log|pem|key|crt|p12)$/i.test(normalized)) {
    return true;
  }
  if (isProd && /\.(ts|tsx)$/i.test(normalized)) {
    return true;
  }
  return false;
}

