import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../src/auth-api.js', import.meta.url), 'utf8');
let run = 0;
const load = () => import('data:text/javascript;base64,' + Buffer.from(source + '\n// test instance ' + (++run)).toString('base64'));
const values = new Map();
globalThis.localStorage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};

test('only the authenticated session is persisted and restored after a new module load', async () => {
  values.clear();
  const auth = await load();
  auth.setAuthSession({verified: true, accessToken: 'fake-access', refreshToken: 'fake-refresh', admin: {name: 'Admin'}, password: 'never-store', code: 'never-store'});
  const saved = JSON.parse(values.get(auth.AUTH_STORAGE_KEY));
  assert.deepEqual(Object.keys(saved).sort(), ['accessToken', 'admin', 'refreshToken', 'verified']);
  const restored = await load();
  assert.equal(restored.getAuthSession().accessToken, 'fake-access');
  assert.equal(restored.getAuthSession().refreshToken, 'fake-refresh');
  restored.clearAuthSession();
  assert.equal(restored.getAuthSession(), null);
  assert.equal(values.has(auth.AUTH_STORAGE_KEY), false);
});

test('malformed or unverified storage does not restore a logged-in session', async () => {
  for (const value of ['not-json', '{}', '{"verified":true}', '{"verified":false,"accessToken":"fake"}']) {
    values.set('mypart.admin.session.v1', value);
    assert.equal((await load()).getAuthSession(), null);
  }
});

test('verification retains both tokens and login requests never use cookies', async () => {
  values.clear();
  const original = globalThis.fetch;
  let credentials;
  globalThis.fetch = async (_url, options) => {
    credentials = options.credentials;
    return new Response(JSON.stringify({success: true, data: {accessToken: 'fake-access', refreshToken: 'fake-refresh', user: {id: 'admin'}}}), {headers: {'Content-Type': 'application/json'}});
  };
  try {
    const session = await (await load()).verifyLogin('test-challenge', '000000');
    assert.equal(session.refreshToken, 'fake-refresh');
    assert.equal(session.verified, true);
    assert.equal(credentials, 'omit');
  } finally { globalThis.fetch = original; }
});

test('local session is cleared even if server logout is offline', async () => {
  const auth = await load();
  auth.setAuthSession({verified: true, accessToken: 'fake-access', refreshToken: 'fake-refresh'});
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  try { await auth.logout(); assert.equal(auth.getAuthSession(), null); assert.equal(values.has(auth.AUTH_STORAGE_KEY), false); }
  finally { globalThis.fetch = original; }
});

test('login and resend use the documented email challenge endpoints without cookies', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url, method: options.method, credentials: options.credentials, body: JSON.parse(options.body)});
    return new Response(JSON.stringify({success: true, data: {otpRequired: true, challengeId: 'test-challenge', maskedEmail: 'a***@example.test', expiresAt: '2026-10-20T12:00:00Z', resendsRemaining: 2}}), {headers: {'Content-Type': 'application/json'}});
  };
  try {
    const auth = await load();
    const challenge = await auth.requestLogin('admin@example.test', 'test-password');
    assert.equal(challenge.maskedEmail, 'a***@example.test');
    await auth.resendLoginCode(challenge.challengeId);
    assert.deepEqual(calls, [
      {url: auth.API_BASE_URL + '/api/admin/login', method: 'POST', credentials: 'omit', body: {email: 'admin@example.test', password: 'test-password'}},
      {url: auth.API_BASE_URL + '/api/admin/login/resend', method: 'POST', credentials: 'omit', body: {challengeId: 'test-challenge'}},
    ]);
  } finally { globalThis.fetch = original; }
});

test('a successful verify response without an access token cannot create a session', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({success: true, data: {authenticated: true}}), {headers: {'Content-Type': 'application/json'}});
  try {
    const auth = await load();
    await assert.rejects(auth.verifyLogin('test-challenge', '123456'), /جلسة دخول صالحة/);
    assert.equal(auth.getAuthSession(), null);
  } finally { globalThis.fetch = original; }
});
