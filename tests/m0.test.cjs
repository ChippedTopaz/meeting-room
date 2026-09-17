// Run: node --test tests/m0.test.cjs (Node built-ins only; no live requests).
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const gasFiles = fs.readdirSync('gas').filter(file => file.endsWith('.gs'));

function backend() {
  const cache = new Map();
  const requests = [];
  const logs = [];
  const state = {batchCount: 0, status: 200, cacheFails: false};
  function respond(options) {
    requests.push(options);
    const url = new URL(options.url);
    const path = url.pathname.split('/contents/')[1];
    let body;
    if (options.method === 'put') {
      const payload = JSON.parse(options.payload);
      assert.equal(payload.sha, 'current-sha');
      assert.equal(payload.branch, 'main');
      body = {content: {sha: 'new-sha'}};
    } else {
      assert.equal(url.searchParams.get('ref'), 'main');
      const document = JSON.parse(fs.readFileSync(path, 'utf8'));
      document.token = 'DO_NOT_EXPOSE';
      document.passwordHash = 'DO_NOT_EXPOSE';
      if (document.rooms) document.rooms.push({id: 'R1', name: 'Room', token: 'DO_NOT_EXPOSE'});
      if (document.requirements) document.requirements[0].secret = 'DO_NOT_EXPOSE';
      body = {type: 'file', encoding: 'base64', sha: 'current-sha',
        content: Buffer.from(JSON.stringify(document)).toString('base64')};
    }
    return {getResponseCode: () => state.status,
      getContentText: () => state.status === 200 ? JSON.stringify(body) : 'DO_NOT_EXPOSE'};
  }
  const context = vm.createContext({
    console: {log: line => logs.push(line)},
    Logger: {log() {}},
    PropertiesService: {getScriptProperties: () => ({getProperty: key => ({
      GITHUB_OWNER: 'owner', GITHUB_REPO: 'repo', GITHUB_BRANCH: 'main', GITHUB_TOKEN: 'DO_NOT_EXPOSE'
    })[key]})},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: text => ({text, setMimeType() { return this; }})},
    CacheService: {getScriptCache: () => ({
      get(key) { if (state.cacheFails) throw Error('cache unavailable'); return cache.get(key) || null; },
      put(key, value, ttl) { assert.equal(ttl, 120); cache.set(key, value); },
      remove(key) { cache.delete(key); }
    })},
    Utilities: {Charset: {UTF_8: 'utf8'}, base64Encode: text => Buffer.from(text).toString('base64'),
      base64Decode: text => Buffer.from(text, 'base64'), newBlob: bytes => ({getDataAsString: () => bytes.toString('utf8')})},
    UrlFetchApp: {fetch: (url, options) => respond({...options, url}),
      fetchAll: options => { state.batchCount++; return options.map(respond); }}
  });
  vm.runInContext(gasFiles.map(file => fs.readFileSync('gas/' + file, 'utf8')).join('\n'), context);
  return {context, cache, state, requests, logs,
    post: action => JSON.parse(context.doPost({postData: {contents: JSON.stringify({action})}}).text)};
}

test('all JS/GS syntax and JSON parse', () => {
  for (const file of [...gasFiles.map(f => 'gas/' + f), ...fs.readdirSync('js').map(f => 'js/' + f), 'sw.js']) {
    new vm.Script(fs.readFileSync(file, 'utf8'), {filename: file});
  }
  for (const path of ['config/system', 'config/requirements', 'rooms/rooms', 'users/users', 'bookings/bookings_2026', 'logs/audit_2026']) {
    JSON.parse(fs.readFileSync('database/' + path + '.json', 'utf8'));
  }
  for (const file of ['manifest.json', 'gas/appsscript.json']) JSON.parse(fs.readFileSync(file, 'utf8'));
});

test('cold bootstrap batches three reads; warm bootstrap makes zero GitHub calls', () => {
  const b = backend();
  const cold = b.post('bootstrap');
  assert.equal(cold.success, true);
  assert.equal(cold.data.meta.cache, 'miss');
  assert.equal(b.state.batchCount, 1);
  assert.equal(b.requests.length, 3);
  assert.equal(cold.data.requirements.requirements.length, 4);
  assert.equal(cold.data.system.systemName, JSON.parse(fs.readFileSync('database/config/system.json')).systemName);
  assert.equal(b.post('bootstrap').data.meta.cache, 'hit');
  assert.equal(b.requests.length, 3);
  assert.ok(!JSON.stringify(cold).includes('DO_NOT_EXPOSE'));
  assert.ok(![...b.cache.values()].join('').includes('DO_NOT_EXPOSE'));
  assert.ok(!b.logs.join('').includes('DO_NOT_EXPOSE'));
});

test('evicted/corrupt/unavailable cache falls back; GitHub failures are not cached', () => {
  const b = backend();
  b.post('bootstrap'); b.cache.clear();
  assert.equal(b.post('bootstrap').data.meta.cache, 'miss');
  b.cache.set(b.context.catalogCacheKey_(), '{');
  assert.equal(b.post('bootstrap').success, true);
  b.state.cacheFails = true;
  assert.equal(b.post('bootstrap').success, true);
  b.state.cacheFails = false; b.cache.clear(); b.state.status = 403;
  const error = b.post('bootstrap');
  assert.equal(error.error.code, 'GITHUB_HTTP_ERROR');
  assert.equal(b.cache.size, 0);
  assert.ok(!JSON.stringify(error).includes('DO_NOT_EXPOSE'));
});

test('successful catalog writes invalidate; failed writes do not; raw booking reads bypass cache', () => {
  const b = backend(); b.post('bootstrap');
  b.context.githubWriteJson('config/system.json', {version: 1}, 'mock write');
  assert.equal(b.cache.size, 0);
  assert.equal(b.requests.at(-2).method, 'get');
  assert.equal(b.requests.at(-1).method, 'put');
  b.post('bootstrap'); b.state.status = 409;
  assert.throws(() => b.context.githubUpdateFile('rooms/rooms.json', '{}', 'current-sha', 'mock'), e => e.publicCode === 'GITHUB_CONFLICT');
  assert.equal(b.cache.size, 1);
  b.state.status = 200;
  const before = b.requests.length;
  b.context.githubGetJson('bookings/bookings_2026.json');
  b.context.githubGetJson('bookings/bookings_2026.json');
  assert.equal(b.requests.length, before + 2);
  b.context.clearCatalogCacheInternal(); assert.equal(b.cache.size, 0);
});

test('legacy diagnostic routes work; forbidden actions never reach GitHub', () => {
  const b = backend();
  for (const action of ['ping', 'getSystemInfo', 'getRooms', 'getRequirements']) assert.equal(b.post(action).success, true);
  assert.equal(b.requests.length, 3);
  for (const action of ['getUsers', 'getAuditLogs', 'testWrite', 'writeJson', 'updateJson', 'testGithubWriteInternal', 'clearCatalogCacheInternal', '__proto__']) {
    assert.equal(b.post(action).error.code, 'ACTION_NOT_ALLOWED');
  }
  assert.equal(b.requests.length, 3);
});

test('frontend loads once, prevents duplicate clicks and handles failure without fallback', async () => {
  const elements = {};
  for (const id of ['check-connection', 'connection-status', 'gas-status', 'system-info', 'rooms', 'requirements']) {
    elements[id] = {textContent: '', disabled: false, addEventListener() {}};
  }
  let calls = 0, resolve;
  const context = vm.createContext({performance,
    document: {getElementById: id => elements[id]},
    apiRequest: action => { assert.equal(action, 'bootstrap'); calls++; return new Promise(r => { resolve = r; }); }});
  vm.runInContext(['state', 'utils', 'app'].map(f => fs.readFileSync('js/' + f + '.js', 'utf8')).join('\n'), context);
  assert.equal(calls, 1);
  await context.checkConnection(); assert.equal(calls, 1);
  resolve(backend().post('bootstrap').data);
  await new Promise(setImmediate);
  assert.equal(elements['check-connection'].disabled, false);
  assert.ok(elements['system-info'].textContent.includes('systemName'));
  context.apiRequest = async () => { calls++; throw Error('timeout'); };
  await context.checkConnection();
  assert.equal(calls, 2); assert.equal(elements.rooms.textContent, 'timeout');
  assert.equal(elements['check-connection'].disabled, false);
});

test('API keeps 30s deadline and preserves abort while reading response body', async () => {
  const context = vm.createContext({AbortController, Error, TypeError,
    setTimeout: (callback, ms) => { assert.equal(ms, 30000); return 1; }, clearTimeout() {},
    fetch: async (url, options) => {
      assert.equal(options.headers['Content-Type'], 'text/plain;charset=utf-8');
      assert.equal(JSON.parse(options.body).action, 'bootstrap');
      return {ok: true, json: async () => { const error = Error('aborted'); error.name = 'AbortError'; throw error; }};
    }});
  vm.runInContext(fs.readFileSync('js/api.js', 'utf8'), context);
  await assert.rejects(context.apiRequest('bootstrap'), /30/);
});
