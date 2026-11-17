import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { DocumentAnalysis, Language, SavedAnalysisRecord } from '../types/document';

interface FirebaseAppletConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

const localConfigModules = import.meta.glob<{ default: FirebaseAppletConfig }>(
  '/firebase-applet-config.json',
  { eager: true }
);
const localFileConfig: FirebaseAppletConfig =
  localConfigModules['/firebase-applet-config.json']?.default ?? {};

const firebaseConfig: FirebaseAppletConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localFileConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localFileConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localFileConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFileConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFileConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localFileConfig.appId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID || localFileConfig.firestoreDatabaseId,
  measurementId: localFileConfig.measurementId,
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db: Firestore | null = app
  ? firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app)
  : null;
export const auth: Auth | null = app ? getAuth(app) : null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

const MAX_LIST_ITEMS = 20;

function sanitizeAnalysisForFirestore(analysis: DocumentAnalysis) {
  return {
    type: analysis.type.trim().slice(0, 120) || 'Document',
    summary: analysis.summary.trim().slice(0, 1600) || 'Summary unavailable.',
    deadlines: analysis.deadlines.slice(0, MAX_LIST_ITEMS).map((d) => ({
      when: String(d.when ?? '').slice(0, 120),
      what: String(d.what ?? '').slice(0, 220),
      note: String(d.note ?? '').slice(0, 320),
    })),
    money: analysis.money.slice(0, MAX_LIST_ITEMS).map((m) => ({
      label: String(m.label ?? '').slice(0, 140),
      amount: String(m.amount ?? '').slice(0, 120),
      note: String(m.note ?? '').slice(0, 320),
    })),
    risks: analysis.risks.slice(0, MAX_LIST_ITEMS).map((r) => ({
      sev: r.sev === 'high' || r.sev === 'medium' ? r.sev : 'low',
      clause: String(r.clause ?? '').slice(0, 140),
      text: String(r.text ?? '').slice(0, 420),
    })),
    steps: analysis.steps.slice(0, MAX_LIST_ITEMS).map((s) => String(s ?? '').slice(0, 320)),
  };
}

function buildSafeAnalysisId(): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `scan_${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 128);
}

function requireFirebase(): { auth: Auth; db: Firestore } {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  return { auth, db };
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(preferredLanguage: Language): Promise<User> {
  const { auth: activeAuth } = requireFirebase();
  const cred = await signInWithPopup(activeAuth, googleProvider);
  await ensureUserProfile(cred.user, preferredLanguage);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export async function ensureUserProfile(
  user: User,
  preferredLanguage: Language
): Promise<Language> {
  const { db: activeDb } = requireFirebase();
  const path = `users/${user.uid}`;
  const ref = doc(activeDb, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName ?? 'Samajh User').slice(0, 120);
    const email = (user.email ?? '').slice(0, 254);
    const photoURL = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        email,
        preferredLanguage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(ref, payload);
      return preferredLanguage;
    }

    const existingData = snap.data();
    const updatePayload: Record<string, unknown> = {
      displayName,
      email,
      updatedAt: serverTimestamp(),
    };
    if (photoURL) updatePayload.photoURL = photoURL;
    await updateDoc(ref, updatePayload);

    return existingData.preferredLanguage === 'hi' ? 'hi' : 'en';
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePreferredLanguage(
  userId: string,
  preferredLanguage: Language
): Promise<void> {
  const { db: activeDb } = requireFirebase();
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(activeDb, 'users', userId), {
      preferredLanguage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeSavedAnalyses(
  userId: string,
  onData: (items: SavedAnalysisRecord[]) => void,
  onError: (err: Error) => void
) {
  if (!db) {
    onData([]);
    return () => {};
  }
  const path = `users/${userId}/analyses`;
  const q = query(
    collection(db, 'users', userId, 'analyses'),
    where('userId', '==', userId),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: SavedAnalysisRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
        return {
          id: String(data.id ?? d.id),
          userId: String(data.userId ?? userId),
          language: data.language === 'hi' ? 'hi' : 'en',
          type: String(data.type ?? 'Document'),
          summary: String(data.summary ?? ''),
          deadlines: Array.isArray(data.deadlines) ? data.deadlines : [],
          money: Array.isArray(data.money) ? data.money : [],
          risks: Array.isArray(data.risks) ? data.risks : [],
          steps: Array.isArray(data.steps) ? data.steps : [],
          completedSteps: Array.isArray(data.completedSteps)
            ? data.completedSteps.filter((n): n is number => typeof n === 'number')
            : [],
          updatedAtMs: ts,
        };
      });
      records.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error('Could not load saved scans.'));
      }
    }
  );
}

export async function saveAnalysisToAccount(
  user: User,
  analysis: DocumentAnalysis,
  language: Language,
  completedSteps: number[],
  existingId?: string | null
): Promise<string> {
  const { db: activeDb } = requireFirebase();
  await ensureUserProfile(user, language);
  const analysisId = existingId && /^[a-zA-Z0-9_-]{1,128}$/.test(existingId)
    ? existingId
    : buildSafeAnalysisId();
  const path = `users/${user.uid}/analyses/${analysisId}`;
  const ref = doc(activeDb, 'users', user.uid, 'analyses', analysisId);
  const sanitized = sanitizeAnalysisForFirestore(analysis);
  const cleanSteps = completedSteps
    .filter((n) => Number.isInteger(n) && n >= 0 && n < MAX_LIST_ITEMS)
    .slice(0, MAX_LIST_ITEMS);

  try {
    if (existingId) {
      await updateDoc(ref, {
        language,
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
      return analysisId;
    }

    await setDoc(ref, {
      id: analysisId,
      userId: user.uid,
      language,
      ...sanitized,
      completedSteps: cleanSteps,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return analysisId;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateSavedSteps(
  userId: string,
  analysisId: string,
  completedSteps: number[]
): Promise<void> {
  const { db: activeDb } = requireFirebase();
  const path = `users/${userId}/analyses/${analysisId}`;
  const cleanSteps = completedSteps
    .filter((n) => Number.isInteger(n) && n >= 0 && n < MAX_LIST_ITEMS)
    .slice(0, MAX_LIST_ITEMS);
  try {
    await updateDoc(doc(activeDb, 'users', userId, 'analyses', analysisId), {
      completedSteps: cleanSteps,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSavedAnalysis(
  userId: string,
  analysisId: string
): Promise<void> {
  const { db: activeDb } = requireFirebase();
  const path = `users/${userId}/analyses/${analysisId}`;
  try {
    await deleteDoc(doc(activeDb, 'users', userId, 'analyses', analysisId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
