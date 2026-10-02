// Takes the raw screenshots for one interface language: loads the extension into a headless
// Chrome for Testing, opens the demo site (scripts/screenshots/demo.py) in the viewer, and
// shoots the media list, the opened image group and downloads under way. Also records where
// the rows and buttons the store images point at are, for compose.py.
//
//   node scripts/screenshots/capture.mjs <en|zh-TW>
//
// Branded Chrome ignores --load-extension, so this needs Chrome for Testing or Chromium: set
// VIDEOTOGO_CHROME, or let it find the newest one Puppeteer or Playwright has downloaded.

import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const WORK = join(ROOT, 'dist', 'screenshots-work');
const DEMO = join(WORK, 'demo');
const LANG = process.argv[2];
if (!['en', 'zh-TW'].includes(LANG)) throw new Error('usage: capture.mjs <en|zh-TW>');
if (!existsSync(join(DEMO, 'watch.html'))) throw new Error('no demo site: run scripts/screenshots/demo.py first');
const OUT = join(WORK, 'shots', LANG);
mkdirSync(OUT, { recursive: true });
const { version } = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));

const SERVER_PORT = 8766;
const DEBUG_PORT = 9334;
const PAGE = 'http://horizon-clips.example/watch.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.VIDEOTOGO_CHROME) return process.env.VIDEOTOGO_CHROME;
  const exe = process.platform === 'win32' ? 'chrome.exe' : 'chrome';
  const candidates = [];
  const scan = (dir, sub) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      for (const s of sub) {
        const path = join(dir, name, s, exe);
        if (existsSync(path)) candidates.push({ name, path });
      }
    }
  };
  scan(join(homedir(), '.cache', 'puppeteer', 'chrome'), ['chrome-win64', 'chrome-linux64', 'chrome-mac-x64', 'chrome-mac-arm64']);
  scan(join(homedir(), 'AppData', 'Local', 'ms-playwright'), ['chrome-win']);
  scan(join(homedir(), '.cache', 'ms-playwright'), ['chrome-linux']);
  const byVersion = (s) => s.name.match(/\d+/g)?.map(Number) || [];
  candidates.sort((a, b) => {
    const [x, y] = [byVersion(a), byVersion(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0);
    return 0;
  });
  if (!candidates.length) throw new Error('no Chrome for Testing found: set VIDEOTOGO_CHROME');
  return candidates[0].path;
}

// The demo site, at a made-up host the browser maps to this server. In slow mode media goes
// out at about 150 KB/s per request, so downloads are caught part-way.
const TYPES = {
  html: 'text/html; charset=utf-8', jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4',
  js: 'text/javascript', m3u8: 'application/vnd.apple.mpegurl', ts: 'video/mp2t',
};
let slow = false;
const server = http.createServer(async (req, res) => {
  const file = join(DEMO, decodeURIComponent(req.url.split('?')[0]));
  let data;
  try {
    data = readFileSync(file);
  } catch {
    res.writeHead(404);
    return res.end();
  }
  let start = 0;
  let end = data.length - 1;
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range) {
    start = range[1] ? +range[1] : 0;
    end = range[2] ? +range[2] : end;
  }
  const headers = { 'content-type': TYPES[file.split('.').pop()] || 'application/octet-stream', 'content-length': end - start + 1, 'accept-ranges': 'bytes' };
  if (range) headers['content-range'] = `bytes ${start}-${end}/${data.length}`;
  res.writeHead(range ? 206 : 200, headers);
  const body = data.subarray(start, end + 1);
  if (!slow || !/\.(ts|mp4|jpg)$/.test(file)) return res.end(body);
  for (let i = 0; i < body.length && !res.destroyed; i += 16384) {
    res.write(body.subarray(i, i + 16384));
    await sleep(110);
  }
  res.end();
}).listen(SERVER_PORT);

const profile = join(WORK, `profile-${LANG}`);
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(findChrome(), [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  `--lang=${LANG}`, `--accept-lang=${LANG}`, '--autoplay-policy=no-user-gesture-required',
  `--host-resolver-rules=MAP horizon-clips.example 127.0.0.1:${SERVER_PORT}`, '--hide-scrollbars',
  `--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--no-first-run', 'about:blank',
]);

function shutdown() {
  if (process.platform === 'win32') execSync(`taskkill /pid ${chrome.pid} /T /F`, { stdio: 'ignore' });
  else chrome.kill();
  server.close();
}

async function waitFor(what, fn, ms = 30000) {
  for (const until = Date.now() + ms; Date.now() < until; await sleep(250)) {
    const value = await fn();
    if (value) return value;
  }
  throw new Error(`timed out waiting for ${what}`);
}

try {
  const browser = await waitFor('Chrome', () => fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json(), () => null));
  const ws = new WebSocket(browser.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  const cdp = (method, params = {}, sessionId) =>
    new Promise((r) => {
      const id = ++seq;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const evaluate = async (session, expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, session);
    return r.result?.result?.value;
  };
  const attach = async (targetId) => (await cdp('Target.attachToTarget', { targetId, flatten: true })).result.sessionId;

  // Chrome has service workers of its own named background.js; this one has our version.
  const extId = await waitFor('the extension', async () => {
    const { targetInfos } = (await cdp('Target.getTargets')).result;
    for (const t of targetInfos.filter((t) => t.type === 'service_worker' && t.url.endsWith('/background.js'))) {
      if ((await evaluate(await attach(t.targetId), 'chrome.runtime?.getManifest?.().version')) === version) return new URL(t.url).host;
    }
    return null;
  });
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: join(WORK, `downloads-${LANG}`) });

  async function open(url, width, height) {
    const { targetId } = (await cdp('Target.createTarget', { url: 'about:blank' })).result;
    const session = await attach(targetId);
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false }, session);
    await cdp('Page.navigate', { url }, session);
    return session;
  }
  async function shot(session, name) {
    const { data } = (await cdp('Page.captureScreenshot', { format: 'png' }, session)).result;
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
    console.log(`${LANG}: ${name}.png`);
  }

  // The page in an ordinary tab, for the browser mock-up.
  const page = await open(PAGE, 1180, 700);
  await sleep(5000);
  await shot(page, 'page');

  // The viewer, at a size whose text stays legible once scaled into a 1280x800 image.
  const v = await open(`chrome-extension://${extId}/viewer/viewer.html?url=${encodeURIComponent(PAGE)}`, 680, 720);
  const msg = (key, subs = []) => evaluate(v, `chrome.i18n.getMessage(${JSON.stringify(key)}, ${JSON.stringify(subs)})`);
  const prefix = async (key) => (await msg(key, ['#'])).split('#')[0];
  const rowNames = () => evaluate(v, `[...document.querySelectorAll('#media li')].map((li) => li.firstElementChild?.textContent || '')`);
  // A row of the media list or the queue (the first whose text contains `row`), or its
  // button labelled `label`, or its '.meta' text.
  const find = (row, label, where) => `(() => {
    const li = [...document.querySelectorAll(${JSON.stringify(where)})].find((li) => li.textContent.includes(${JSON.stringify(row)}));
    if (!li || ${JSON.stringify(label)} === null) return li || null;
    if (${JSON.stringify(label)} === '.meta') return li.querySelector('.meta');
    return [...li.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)}) || null;
  })()`;
  const click = async (row, label, where = '#media li') => {
    const ok = await evaluate(v, `(() => { const el = ${find(row, label, where)}; el?.click(); return !!el; })()`);
    if (!ok) throw new Error(`no "${label}" in the row "${row}"`);
  };
  const rect = async (row, label = null, where = '#media li') => {
    const r = await evaluate(v, `(() => { const r = ${find(row, label, where)}?.getBoundingClientRect(); return r && { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
    if (!r) throw new Error(`no ${label ?? 'row'} for "${row}"`);
    return r;
  };

  const [mediaPrefix, imagesPrefix, capturePrefix] = [await prefix('mediaGroup'), await prefix('imagesGroup'), await prefix('captureName')];
  const expand = await msg('expand');
  const collapse = await msg('collapse');
  const download = await msg('download');
  // Both videos, the player's buffer and the thumbnails have been detected.
  const names = await waitFor('the media list', async () => {
    const n = await rowNames();
    return n.some((t) => t.startsWith(mediaPrefix)) && n.some((t) => t.startsWith(capturePrefix)) && n.some((t) => t.startsWith(imagesPrefix)) && n;
  });
  const mediaRow = names.find((t) => t.startsWith(mediaPrefix));
  const imagesRow = names.find((t) => t.startsWith(imagesPrefix));
  const marks = {};

  await click(mediaRow, expand);
  await waitFor('the HLS qualities', async () => (await rowNames()).length >= 7);
  marks.list = { mp4: await rect('clip.mp4'), hls1080: await rect('1080p'), hls480: await rect('480p'), capture: await rect(capturePrefix) };
  await shot(v, 'list');

  await click(mediaRow, collapse);
  await click(imagesRow, expand);
  await sleep(500);
  // The image rows, whatever order they arrived in: everything under the images row.
  const imageRows = await evaluate(v, `(() => {
    const lis = [...document.querySelectorAll('#media li')];
    const rows = lis.slice(lis.findIndex((li) => li.textContent.includes(${JSON.stringify(imagesRow)})) + 1).map((li) => li.getBoundingClientRect());
    return rows.length ? { x: rows[0].x, y: rows[0].y, w: rows[0].width, h: rows.at(-1).bottom - rows[0].y } : null;
  })()`);
  marks.images = { downloadAll: await rect(imagesRow, await msg('downloadAll')), rows: imageRows };
  await shot(v, 'images');
  await click(imagesRow, collapse);
  await click(mediaRow, expand);
  await sleep(500);

  // Downloads under way: the images done, two going, one paused.
  slow = true;
  await click(imagesRow, await msg('downloadAll'));
  await sleep(3000);
  await click('1080p', download);
  await sleep(400);
  await click('clip.mp4', download);
  await sleep(3000);
  await click('480p', download);
  await sleep(6000);
  await click('[480p]', await msg('pause'), '#jobs li');
  await sleep(2500);
  marks.queue = {
    paused: await rect('[480p]', null, '#jobs li'),
    mp4Meta: await rect('.mp4', '.meta', '#jobs li'),
    cancel: await rect('[1080p]', '×', '#jobs li'),
  };
  await shot(v, 'queue');
  writeFileSync(join(OUT, 'marks.json'), JSON.stringify(marks, null, 1));
  ws.close();
} finally {
  shutdown();
}
