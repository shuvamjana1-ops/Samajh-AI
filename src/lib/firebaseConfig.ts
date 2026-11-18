export interface ResolvedFirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

export type FirebaseConfigResolution =
  | { isConfigured: true; config: ResolvedFirebaseClientConfig }
  | { isConfigured: false; config: null };

const PLACEHOLDER_PATTERN = /^(?:YOUR_|MY_|REPLACE_|EXAMPLE|CHANGEME|TEST_KEY)/i;

function cleanEnvValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

function isValidAuthDomain(domain: string): boolean {
  if (domain.includes('://') || /[\s/?#\\]/.test(domain)) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

/**
 * Resolves Firebase client configuration strictly from `VITE_FIREBASE_*`
 * environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
 * and `VITE_FIREBASE_PROJECT_ID` required) without reading `firebase-applet-config.json`.
 */
export function buildFirebaseClientConfig(
  env: Record<string, unknown>
): FirebaseConfigResolution {
  const apiKey = cleanEnvValue(env.VITE_FIREBASE_API_KEY);
  const authDomain = cleanEnvValue(env.VITE_FIREBASE_AUTH_DOMAIN);
  const projectId = cleanEnvValue(env.VITE_FIREBASE_PROJECT_ID);

  if (!apiKey || !authDomain || !isValidAuthDomain(authDomain) || !projectId) {
    return { isConfigured: false, config: null };
  }

  const appId = cleanEnvValue(env.VITE_FIREBASE_APP_ID);
  const firestoreDatabaseId = cleanEnvValue(env.VITE_FIREBASE_DATABASE_ID);
  const storageBucket = cleanEnvValue(env.VITE_FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = cleanEnvValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
  const measurementId = cleanEnvValue(env.VITE_FIREBASE_MEASUREMENT_ID);

  const config: ResolvedFirebaseClientConfig = {
    apiKey,
    authDomain,
    projectId,
    ...(appId ? { appId } : {}),
    ...(firestoreDatabaseId ? { firestoreDatabaseId } : {}),
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(measurementId ? { measurementId } : {}),
  };

  return { isConfigured: true, config };
}
