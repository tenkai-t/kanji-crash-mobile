import assert from 'node:assert/strict';
import Cloudflare from '../server/cloudflare.mjs';
import Sites from '../server/worker.mjs';
import {fixture} from './friend-server.mjs';

const f = fixture();
const device = 'a'.repeat(32);
const forged = {'oai-authenticated-user-id': 'existing-account'};
const profile = name => ({name, char: '一', frame: 'plain', color: 'gold', glow: 'none'});
async function call(worker, path, {guest, headers = {}, method = 'GET', body} = {}) {
  const response = await worker.fetch(new Request('https://game.test' + path, {
    method, headers: {'X-Kanji-Device': device, ...headers,
      ...(guest ? {'X-Kanji-Guest': guest.token} : {}),
      ...(body ? {'Content-Type': 'application/json'} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
  }), f.env);
  return {status: response.status, body: await response.json()};
}
const ok = result => {assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body;};
try {
  // Seed a synthetic legacy account through the original trusted Sites entry.
  ok(await call(Sites, '/api/profile', {method: 'PUT', headers: forged, body: profile('既存テスト')}));
  assert.deepEqual(ok(await call(Cloudflare, '/api/session', {headers: forged})), {authenticated: false, guest: false});
  assert.equal((await call(Cloudflare, '/api/profile', {headers: forged})).status, 401);
  assert.equal((await call(Cloudflare, '/api/profile', {method: 'PUT', headers: forged, body: profile('偽装')})).status, 401);

  const guest = ok(await call(Cloudflare, '/api/guest', {method: 'POST', headers: forged, body: {}}));
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM guest_links').get().n, 0);
  assert.equal(ok(await call(Cloudflare, '/api/profile', {guest, headers: forged})).profile, null);
  ok(await call(Cloudflare, '/api/profile', {guest, method: 'PUT', headers: forged, body: profile('新規テスト')}));
  const state = {inventory: [{char: '一', instanceId: 'inst_test', level: 23, exp: 456}], deck: ['inst_test'], coins: 12345, rating: 23000};
  ok(await call(Cloudflare, '/api/guest/state', {guest, method: 'PUT', body: {state, revision: 0}}));
  assert.equal((await call(Cloudflare, '/api/guest/state', {guest, method: 'PUT', body: {state, revision: 0}})).status, 409);
  const restored = ok(await call(Cloudflare, '/api/guest/restore', {method: 'POST', body: {recoveryCode: guest.recoveryCode}}));
  assert.equal(restored.guestId, guest.guestId);
  assert.deepEqual(restored.state, state);
  assert.equal(ok(await call(Cloudflare, '/api/profile', {guest: restored})).profile.name, '新規テスト');
  assert.equal(ok(await call(Sites, '/api/profile', {headers: forged})).profile.name, '既存テスト');

  // Imported legacy links must still resolve to the exact existing owner key.
  f.sqlite.prepare('INSERT INTO guest_links(player_id,legacy_key) VALUES (?,?)').run(guest.guestId, 'existing-account:' + device);
  assert.equal(ok(await call(Cloudflare, '/api/profile', {guest: restored, headers: forged})).profile.name, '既存テスト');
  const other = ok(await call(Cloudflare, '/api/guest', {method: 'POST', body: {}}));
  assert.equal(ok(await call(Cloudflare, '/api/guest/state', {guest: other})).state, null);
  assert.equal((await call(Cloudflare, '/api/guest', {method: 'POST', headers: {Origin: 'https://other.test'}, body: {}})).status, 403);
  console.log('PASS Cloudflare rejects forged identity and legacy linking; guest save/restore/conflict/isolation and imported owner keys preserved; original Sites entry unchanged.');
} finally {
  f.sqlite.close();
}
