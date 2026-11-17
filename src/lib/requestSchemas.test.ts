import test from 'node:test';
import assert from 'node:assert/strict';
import {
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

  const prodResult = validateEnvConfig({ GEMINI_API_KEY: 'configured-key' }, true);
  assert.equal(prodResult.geminiConfigured, true);
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
