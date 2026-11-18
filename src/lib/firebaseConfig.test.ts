import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFirebaseClientConfig } from './firebaseConfig';

test('buildFirebaseClientConfig reads all config strictly from VITE_FIREBASE_* env vars', () => {
  const result = buildFirebaseClientConfig({
    VITE_FIREBASE_API_KEY: 'sample-env-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'my-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'my-project',
    VITE_FIREBASE_APP_ID: '1:123:web:abc',
    VITE_FIREBASE_DATABASE_ID: 'my-db',
    VITE_FIREBASE_STORAGE_BUCKET: 'my-project.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
  });

  assert.equal(result.isConfigured, true);
  if (result.isConfigured) {
    assert.equal(result.config.apiKey, 'sample-env-api-key');
    assert.equal(result.config.authDomain, 'my-project.firebaseapp.com');
    assert.equal(result.config.projectId, 'my-project');
    assert.equal(result.config.appId, '1:123:web:abc');
    assert.equal(result.config.firestoreDatabaseId, 'my-db');
    assert.equal(result.config.storageBucket, 'my-project.firebasestorage.app');
    assert.equal(result.config.messagingSenderId, '123456');
  }
});

test('buildFirebaseClientConfig fails closed when required env vars are missing, placeholder, or malformed', () => {
  assert.equal(buildFirebaseClientConfig({}).isConfigured, false);

  assert.equal(
    buildFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: 'sample-env-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'my-project.firebaseapp.com',
    }).isConfigured,
    false
  );

  assert.equal(
    buildFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: 'YOUR_FIREBASE_WEB_API_KEY',
      VITE_FIREBASE_AUTH_DOMAIN: 'my-project.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'my-project',
    }).isConfigured,
    false
  );

  assert.equal(
    buildFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: 'sample-env-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'https://my-project.firebaseapp.com/login',
      VITE_FIREBASE_PROJECT_ID: 'my-project',
    }).isConfigured,
    false
  );
});
