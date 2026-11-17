import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

test('firestore.rules includes default deny and verified owner checks', () => {
  assert.match(rules, /rules_version = '2';/);
  assert.match(rules, /allow read, write: if false;/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /allow list: if false;/);
  assert.match(rules, /existing\(\)\.userId == request\.auth\.uid/);
  assert.match(rules, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
});

test('firestore.rules enforces blueprint length limits verbatim', () => {
  assert.equal(blueprint.entities.UserProfile.properties.displayName.maxLength, 120);
  assert.equal(blueprint.entities.SavedAnalysis.properties.summary.maxLength, 1600);
  assert.match(rules, /data\.displayName\.size\(\) <= 120/);
  assert.match(rules, /data\.summary\.size\(\) <= 1600/);
  assert.match(rules, /data\.steps\.size\(\) <= 20/);
  assert.match(rules, /data\.completedSteps\.size\(\) <= 20/);
});
