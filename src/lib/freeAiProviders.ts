import type { EnvValidationResult } from './requestSchemas';

export type AiProviderId = 'gemini' | 'groq' | 'openrouter' | 'ollama';

export interface InlineDocumentPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export interface OpenAiContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface OpenAiChatMessage {
  role: 'system' | 'user';
  content: string | OpenAiContentPart[];
}

export function resolveProviderOrder(envConfig: EnvValidationResult): AiProviderId[] {
  const availability: Record<AiProviderId, boolean> = {
    gemini: envConfig.geminiConfigured,
    groq: envConfig.groqConfigured,
    openrouter: envConfig.openrouterConfigured,
    ollama: Boolean(envConfig.ollamaBaseUrl),
  };

  if (envConfig.aiProvider !== 'auto') {
    return availability[envConfig.aiProvider] ? [envConfig.aiProvider] : [];
  }

  const order: AiProviderId[] = ['gemini', 'groq', 'openrouter', 'ollama'];
  return order.filter((provider) => availability[provider]);
}

export function isRetryableProviderError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('RATE_LIMIT') ||
    msg.includes('503') ||
    msg.includes('OVERLOADED')
  );
}

export function buildOpenAiCompatibleMessages(
  systemInstruction: string,
  promptText: string,
  parts: InlineDocumentPart[] = []
): OpenAiChatMessage[] {
  const userContent: OpenAiContentPart[] = [];

  for (const part of parts) {
    const mime = part.inlineData.mimeType.toLowerCase();
    if (mime === 'application/pdf') {
      throw new Error('PDF_REQUIRES_GEMINI');
    }
    if (mime !== 'image/jpeg' && mime !== 'image/png') {
      throw new Error('UNSUPPORTED_PART_MIME');
    }
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mime};base64,${part.inlineData.data}`,
      },
    });
  }

  userContent.push({ type: 'text', text: promptText });

  return [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: parts.length > 0 ? userContent : promptText },
  ];
}

export function extractOpenAiMessageText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('EMPTY_PROVIDER_RESPONSE');
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('EMPTY_PROVIDER_RESPONSE');
  }
  const message = (choices[0] as { message?: { content?: unknown } })?.message;
  const content = message?.content;

  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('EMPTY_PROVIDER_RESPONSE');
    return trimmed;
  }

  if (Array.isArray(content)) {
    const combined = content
      .map((item) =>
        item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string'
          ? (item as { text: string }).text
          : ''
      )
      .join('')
      .trim();
    if (combined) return combined;
  }

  throw new Error('EMPTY_PROVIDER_RESPONSE');
}

export async function executeWithProviderFallback<T>(
  providers: AiProviderId[],
  hasPdfParts: boolean,
  runForProvider: (provider: AiProviderId) => Promise<T>
): Promise<{ result: T; provider: AiProviderId }> {
  if (providers.length === 0) {
    throw new Error('AI_PROVIDER_NOT_CONFIGURED');
  }

  let sawPdfLimitation = false;
  let sawRateLimit = false;
  let lastError: unknown;

  for (const provider of providers) {
    if (hasPdfParts && provider !== 'gemini') {
      sawPdfLimitation = true;
      continue;
    }

    try {
      const result = await runForProvider(provider);
      return { result, provider };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'PDF_REQUIRES_GEMINI') {
        sawPdfLimitation = true;
        continue;
      }
      if (isRetryableProviderError(err) && providers.length > 1) {
        sawRateLimit = true;
        continue;
      }
      throw err;
    }
  }

  if (sawPdfLimitation && !sawRateLimit) {
    throw new Error('PDF_REQUIRES_GEMINI');
  }
  if (sawRateLimit) {
    throw new Error('RESOURCE_EXHAUSTED');
  }
  throw lastError instanceof Error ? lastError : new Error('AI_PROVIDER_FAILED');
}
