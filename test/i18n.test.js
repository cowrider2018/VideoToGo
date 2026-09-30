import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import './chrome-i18n.js';
import { localize, t } from '../lib/i18n.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const locales = ['en', 'zh_TW'];
const messages = Object.fromEntries(locales.map((l) => [l, JSON.parse(read(`_locales/${l}/messages.json`))]));
const placeholders = (m) => Object.keys(m.placeholders || {}).sort();

test('every message the code asks for exists in every locale', () => {
  const sources = ['background.js', 'content.js', 'inject/mse-hook.js', 'viewer/viewer.js', 'viewer/viewer.html', 'manifest.json',
    'lib/dash.js', 'lib/fragments.js', 'lib/hls.js', 'lib/jobs.js'];
  const used = new Set();
  const patterns = [/\bt\('(\w+)'/g, /getMessage\([^'"]*'(\w+)'/g, /getMessage\(.*\? '(\w+)' : '(\w+)'\)/g, /\bfail\('(\w+)'\)/g,
    /data-i18n(?:-\w+)?="(\w+)"/g, /__MSG_(\w+)__/g];
  for (const path of sources) {
    const src = read(path);
    for (const p of patterns) for (const m of src.matchAll(p)) m.slice(1).forEach((n) => n && used.add(n));
  }
  assert.ok(used.size > 50);
  for (const l of locales) assert.deepEqual([...used].filter((n) => !messages[l][n]), [], `missing in ${l}`);
});

test('the locales have the same messages with the same placeholders', () => {
  const [en, zh] = locales.map((l) => messages[l]);
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  for (const name of Object.keys(en)) {
    assert.deepEqual(placeholders(zh[name]), placeholders(en[name]), name);
    for (const m of [en[name], zh[name]]) {
      const named = [...m.message.matchAll(/\$(\w+)\$/g)].map((x) => x[1]).sort();
      assert.deepEqual([...new Set(named)], placeholders(m), name);
    }
  }
});

test('t fills substitutions', () => {
  assert.equal(t('errHttp', 404), 'Download failed (HTTP 404)');
  assert.equal(t('bufferedOf', '0:10', '1:00'), 'buffered 0:10 / 1:00');
});

test('without chrome.i18n a message travels as a token that localize reads', () => {
  const saved = globalThis.chrome;
  globalThis.chrome = {};
  const token = t('errHttp', 403);
  globalThis.chrome = saved;
  assert.equal(token, '__MSG_errHttp__|403');
  assert.equal(localize(token), 'Download failed (HTTP 403)');
  assert.equal(localize('__MSG_cancelled__'), 'Cancelled');
  assert.equal(localize('net::ERR_FAILED'), 'net::ERR_FAILED');
  assert.equal(localize(undefined), undefined);
});
