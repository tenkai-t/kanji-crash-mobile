import assert from 'node:assert/strict';

// This test writes synthetic guest data. Only allow the local Wrangler server.
const base = new URL(process.argv[2] || 'http://127.0.0.1:8787');
assert.equal(base.protocol, 'http:');
assert.equal(base.hostname, '127.0.0.1', 'Run only against local Wrangler, never production.');
const device = crypto.randomUUID().replaceAll('-', '');
const forged = {'oai-authenticated-user-id': 'forged-account'};
async function call(path, {guest, headers = {}, method = 'GET', body} = {}) {
  const response = await fetch(new URL(path, base), {
    method, headers: {'X-Kanji-Device': device, ...headers,
      ...(guest ? {'X-Kanji-Guest': guest.token} : {}),
      ...(body ? {'Content-Type': 'application/json'} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  return {status: response.status, body: await response.json()};
}
const ok = result => {assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body;};
for (const path of ['/', '/game-audio.js', '/audio/menu-v158.wav', '/vendor/fonts/character-parts/core-e8a03bb7673b.woff2']) {
  const r = await fetch(new URL(path, base));
  assert.equal(r.status, 200, path);
  const bytes = await r.arrayBuffer();
  assert(bytes.byteLength > 0, path);
  if (path === '/') assert(new TextDecoder().decode(bytes).includes('漢字クラッシュ'));
}
assert.deepEqual(ok(await call('/api/session', {headers: forged})), {authenticated: false, guest: false});
assert.equal((await call('/api/profile', {headers: forged})).status, 401);
const a = ok(await call('/api/guest', {method: 'POST', headers: forged, body: {}}));
assert.equal(ok(await call('/api/session', {guest: a})).guest, true);
const profile = {name: 'ローカル検証', char: '一', frame: 'plain', color: 'gold', glow: 'none'};
ok(await call('/api/profile', {guest: a, method: 'PUT', headers: forged, body: profile}));
const state = {inventory: [{char: '一', instanceId: 'inst_local_test', level: 23, exp: 456}], deck: ['inst_local_test'], coins: 12345, rating: 23000};
ok(await call('/api/guest/state', {guest: a, method: 'PUT', body: {state, revision: 0}}));
assert.equal((await call('/api/guest/state', {guest: a, method: 'PUT', body: {state, revision: 0}})).status, 409);
const restored = ok(await call('/api/guest/restore', {method: 'POST', body: {recoveryCode: a.recoveryCode}}));
assert.equal(restored.guestId, a.guestId);
assert.deepEqual(restored.state, state);
assert.equal(ok(await call('/api/profile', {guest: restored, headers: forged})).profile.name, profile.name);
const b = ok(await call('/api/guest', {method: 'POST', body: {}}));
assert.equal(ok(await call('/api/guest/state', {guest: b})).state, null);
assert.equal((await call('/api/guest', {method: 'POST', headers: {Origin: 'https://other.test'}, body: {}})).status, 403);
for (const rule of ['cpu', 'endless', 'balanced', 'free', 'cpu-skill']) {
  assert(Array.isArray(ok(await call('/api/leaderboard?rule=' + rule)).entries), rule);
}
console.log('PASS local Workers runtime + D1: static assets, forged-header denial, guest save/restore/conflict/isolation, cross-origin denial and five ranking endpoints.');
