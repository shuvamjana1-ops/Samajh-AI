import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOpenAiCompatibleMessages,
  executeWithProviderFallback,
  extractOpenAiMessageText,
  resolveProviderOrder,
} from './freeAiProviders';
import { validateEnvConfig } from './requestSchemas';

test('resolveProviderOrder selects configured free providers in priority order or explicit override', () => {
  const multi = validateEnvConfig(
    {
      GROQ_API_KEY: 'groq-free-key',
      OPENROUTER_API_KEY: 'or-free-key',
      OLLAMA_BASE_URL: 'http://localhost:11434/',
    },
    true
  );
  assert.deepEqual(resolveProviderOrder(multi), ['groq', 'openrouter', 'ollama']);

  const explicit = validateEnvConfig(
    {
      AI_PROVIDER: 'openrouter',
      GEMINI_API_KEY: 'gem-key',
      OPENROUTER_API_KEY: 'or-free-key',
    },
    true
  );
  assert.deepEqual(resolveProviderOrder(explicit), ['openrouter']);
});

test('buildOpenAiCompatibleMessages embeds image data URLs and blocks PDFs on non-Gemini endpoints', () => {
  const msgs = buildOpenAiCompatibleMessages('System prompt', 'Explain this', [
    { inlineData: { mimeType: 'image/png', data: 'AAAA' } },
  ]);
  assert.equal(msgs.length, 2);
  assert.ok(Array.isArray(msgs[1].content));
  assert.equal(msgs[1].content[0]?.image_url?.url, 'data:image/png;base64,AAAA');

  assert.throws(
    () =>
      buildOpenAiCompatibleMessages('System prompt', 'Explain this', [
        { inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' } },
      ]),
    /PDF_REQUIRES_GEMINI/
  );
});

test('extractOpenAiMessageText handles string and array message content', () => {
  assert.equal(
    extractOpenAiMessageText({ choices: [{ message: { content: '  {"readable":true}  ' } }] }),
    '{"readable":true}'
  );
  assert.equal(
    extractOpenAiMessageText({
      choices: [{ message: { content: [{ type: 'text', text: '{"ok":true}' }] } }],
    }),
    '{"ok":true}'
  );
});

test('executeWithProviderFallback fails over on 429 rate limit and skips non-Gemini providers for PDF', async () => {
  const attempted: string[] = [];
  const res = await executeWithProviderFallback(
    ['gemini', 'groq', 'openrouter'],
    false,
    async (provider) => {
      attempted.push(provider);
      if (provider === 'gemini') {
        throw new Error('429 RESOURCE_EXHAUSTED');
      }
      return `ok-from-${provider}`;
    }
  );
  assert.deepEqual(attempted, ['gemini', 'groq']);
  assert.equal(res.provider, 'groq');
  assert.equal(res.result, 'ok-from-groq');

  await assert.rejects(
    () =>
      executeWithProviderFallback(['groq', 'openrouter'], true, async () => {
        return 'should-not-run';
      }),
    /PDF_REQUIRES_GEMINI/
  );
});
