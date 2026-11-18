import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DailyQuotaTracker,
  isBlockedSensitivePath,
  validateAnalyzeBody,
  validateAskBody,
  validateContactBody,
  validateEnvConfig,
  validateTranslateBody,
} from './requestSchemas';
import type { DocumentAnalysis } from '../types/document';

const VALID_ANALYSIS: DocumentAnalysis = {
  readable: true,
  type: 'Rental Agreement',
  summary: '11-month residential lease at Rs 30,000 per month.',
  deadlines: [{ when: '5th monthly', what: 'Pay rent', note: 'Late fee applies after 7th' }],
  money: [{ label: 'Deposit', amount: 'Rs 1,80,000', note: 'Refundable without interest' }],
  risks: [{ sev: 'high', clause: 'Clause 6', text: 'Uncapped daily late fee.' }],
  steps: ['Request late fee cap in writing'],
};

test('validateEnvConfig validates ports, URLs, and production GEMINI_API_KEY', () => {
  const devResult = validateEnvConfig({ PORT: '3000', APP_URL: 'https://samajh.app' }, false);
  assert.equal(devResult.port, 3000);
  assert.equal(devResult.appUrl, 'https://samajh.app');
  assert.equal(devResult.geminiConfigured, false);

  assert.throws(() => validateEnvConfig({ PORT: '99999' }, false));
  assert.throws(() => validateEnvConfig({ APP_URL: 'javascript:alert(1)' }, false));
  assert.throws(() => validateEnvConfig({}, true));

  const prodResult = validateEnvConfig(
    {
      GEMINI_API_KEY: 'configured-key',
      DISABLE_PAID_AI: 'true',
      AI_DAILY_GLOBAL_LIMIT: '200',
      AI_DAILY_IP_LIMIT: '10',
    },
    true
  );
  assert.equal(prodResult.geminiConfigured, true);
  assert.equal(prodResult.disablePaidAi, true);
  assert.equal(prodResult.aiDailyGlobalLimit, 200);
  assert.equal(prodResult.aiDailyIpLimit, 10);

  assert.throws(() => validateEnvConfig({ DISABLE_PAID_AI: 'yes' }, false));
  assert.throws(() => validateEnvConfig({ AI_DAILY_GLOBAL_LIMIT: '0' }, false));
  assert.throws(() => validateEnvConfig({ AI_DAILY_IP_LIMIT: 'abc' }, false));
  assert.throws(() => validateEnvConfig({ AI_PROVIDER: 'unknown' }, false));
  assert.throws(() => validateEnvConfig({ GEMINI_MODEL: 'gemini-1.5-flash' }, false));
  assert.throws(() => validateEnvConfig({ OLLAMA_BASE_URL: 'ftp://localhost:11434' }, false));

  const groqOnlyProd = validateEnvConfig(
    { GROQ_API_KEY: 'gsk-free-tier', GEMINI_MODEL: 'gemini-3.1-flash-lite' },
    true
  );
  assert.equal(groqOnlyProd.groqConfigured, true);
  assert.equal(groqOnlyProd.anyAiConfigured, true);
  assert.equal(groqOnlyProd.geminiModel, 'gemini-3.1-flash-lite');
});

test('DailyQuotaTracker enforces per-IP and global daily caps and resets on UTC day rollover', () => {
  const tracker = new DailyQuotaTracker(3, 2);
  const day1 = Date.parse('2026-11-18T12:00:00Z');
  const day2 = Date.parse('2026-11-19T00:01:00Z');

  assert.deepEqual(tracker.consume('198.51.100.1', day1), { ok: true });
  assert.deepEqual(tracker.consume('198.51.100.1', day1), { ok: true });

  const ipBlocked = tracker.consume('198.51.100.1', day1);
  assert.equal(ipBlocked.ok, false);
  if (!ipBlocked.ok) {
    assert.equal(ipBlocked.scope, 'ip');
    assert.ok(ipBlocked.retryAfterSeconds > 0);
  }

  assert.deepEqual(tracker.consume('198.51.100.2', day1), { ok: true });
  const globalBlocked = tracker.consume('198.51.100.2', day1);
  assert.equal(globalBlocked.ok, false);
  if (!globalBlocked.ok) {
    assert.equal(globalBlocked.scope, 'global');
    assert.ok(globalBlocked.retryAfterSeconds > 0);
  }

  assert.deepEqual(tracker.consume('198.51.100.1', day2), { ok: true });
});

test('validateContactBody rejects unknown fields, honeypot, bad email, and oversized fields', () => {
  const ok = validateContactBody({
    name: 'Asha Verma',
    email: 'asha@example.com',
    message: 'Need help reading a rental notice.',
    website: '',
    utm: { utm_source: 'search' },
  });
  assert.equal(ok.ok, true);

  assert.equal(
    validateContactBody({
      name: 'Asha Verma',
      email: 'asha@example.com',
      message: 'Need help reading a rental notice.',
      role: 'admin',
    }).ok,
    false
  );

  assert.equal(
    validateContactBody({
      name: 'Asha Verma',
      email: 'asha@example.com',
      message: 'Need help reading a rental notice.',
      website: 'https://spam.example',
    }).ok,
    false
  );

  assert.equal(
    validateContactBody({
      name: 'Asha Verma',
      email: 'bad-email',
      message: 'Need help reading a rental notice.',
    }).ok,
    false
  );
});

test('validateAnalyzeBody rejects unknown keys on root and page items', () => {
  assert.equal(
    validateAnalyzeBody({
      pages: [{ base64: 'AAAA', mimeType: 'image/png' }],
      language: 'hi',
    }).ok,
    true
  );

  assert.equal(
    validateAnalyzeBody({
      pages: [{ base64: 'AAAA', mimeType: 'image/png', extra: 'evil' }],
      language: 'en',
    }).ok,
    false
  );

  assert.equal(
    validateAnalyzeBody({
      pages: [{ base64: 'AAAA', mimeType: 'image/png' }],
      language: 'fr',
    }).ok,
    false
  );
});

test('validateTranslateBody and validateAskBody enforce strict analysis shape', () => {
  assert.equal(
    validateTranslateBody({
      analysis: VALID_ANALYSIS,
      targetLanguage: 'hi',
    }).ok,
    true
  );

  assert.equal(
    validateTranslateBody({
      analysis: { ...VALID_ANALYSIS, injectedField: true },
      targetLanguage: 'hi',
    }).ok,
    false
  );

  assert.equal(
    validateAskBody({
      question: 'What is the deposit?',
      language: 'en',
      analysis: VALID_ANALYSIS,
      pages: [{ base64: 'AAAA', mimeType: 'image/png' }],
    }).ok,
    true
  );

  assert.equal(
    validateAskBody({
      question: '',
      language: 'en',
      analysis: VALID_ANALYSIS,
    }).ok,
    false
  );
});

test('isBlockedSensitivePath blocks firebase config, /@fs/ workspace reads, dotfiles, and traversal', () => {
  assert.equal(isBlockedSensitivePath('/firebase-applet-config.json', false), true);
  assert.equal(isBlockedSensitivePath('/firebase-applet-config.json', true), true);
  assert.equal(isBlockedSensitivePath('/@fs/app/applet/firebase-applet-config.json', false), true);
  assert.equal(isBlockedSensitivePath('/@fs/app/applet/.env', false), true);
  assert.equal(isBlockedSensitivePath('/assets/../firebase-applet-config.json', false), true);
  assert.equal(isBlockedSensitivePath('/%2eenv', false), true);
  assert.equal(isBlockedSensitivePath('/%ZZ', false), true);

  assert.equal(isBlockedSensitivePath('/node_modules/.vite/deps/react.js', false), false);
  assert.equal(isBlockedSensitivePath('/@fs/app/applet/node_modules/vite/dist/client/client.mjs', false), false);
  assert.equal(isBlockedSensitivePath('/src/App.tsx', false), false);
  assert.equal(isBlockedSensitivePath('/src/App.tsx', true), true);
});

