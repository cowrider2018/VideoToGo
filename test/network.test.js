import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { fetchFile, makeFetchBytes, makeGate, runHlsJob } from '../lib/jobs.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A fake server with a switch for the network: while it is down, new requests fail and
// responses being read break off, the way fetch() fails when the connection drops.
function flakyServer(data) {
  const net = { up: true };
  const requests = [];
  const fetchImpl = async (url, { headers = {} } = {}) => {
    requests.push(headers.Range || 'full');
    if (!net.up) throw new TypeError('Failed to fetch');
    const from = headers.Range ? Number(headers.Range.match(/bytes=(\d+)-/)[1]) : 0;
    const body = data.subarray(from);
    let pos = 0;
    const stream = new ReadableStream({
      async pull(ctl) {
        await sleep(5);
        if (!net.up) return ctl.error(new TypeError('network error'));
        if (pos >= body.length) return ctl.close();
        ctl.enqueue(new Uint8Array(body.subarray(pos, pos + 1024)));
        pos += 1024;
      },
    });
    return new Response(stream, {
      status: from ? 206 : 200,
      headers: {
        'content-length': String(body.length),
        ...(from ? { 'content-range': `bytes ${from}-${data.length - 1}/${data.length}` } : {}),
      },
    });
  };
  return { fetchImpl, requests, net };
}

test('fetchFile stalls when the connection drops and carries on from there', async () => {
  const data = randomBytes(40 * 1024);
  const { fetchImpl, requests, net } = flakyServer(data);
  let stalls = 0;
  const gate = makeGate({ onStall: () => stalls++ });
  let seen = 0;
  const done = fetchFile('https://x/f.mp4', { fetchImpl, gate, onProgress: (p) => (seen = p.bytes) });
  while (seen < 8 * 1024) await sleep(5);
  net.up = false;
  while (!gate.stalled) await sleep(5);
  assert.equal(stalls, 1);
  await sleep(40);
  assert.equal(requests.length, 1, 'no requests while stalled');
  net.up = true;
  gate.resume();
  const blob = await done;
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), data);
  assert.match(requests[1], /^bytes=\d+-$/);
});

test('fetchFile still fails on an HTTP error', async () => {
  const gate = makeGate({ onStall: () => assert.fail('an HTTP error is not a lost connection') });
  const fetchImpl = async () => new Response('', { status: 404 });
  await assert.rejects(fetchFile('https://x/f.mp4', { fetchImpl, gate }), /404/);
});

test('fetchBytes waits out a lost connection instead of using up its retries', async () => {
  const data = randomBytes(2048);
  const { fetchImpl, net } = flakyServer(data);
  const gate = makeGate();
  const fetchBytes = makeFetchBytes({ fetchImpl, gate, retries: 1 });
  net.up = false;
  const done = fetchBytes('https://x/s.ts', null);
  while (!gate.stalled) await sleep(5);
  net.up = true;
  gate.resume();
  assert.deepEqual(Buffer.from(await done), data);
});

test('runHlsJob survives the network going away mid-stream', async () => {
  const segs = Array.from({ length: 30 }, () => randomBytes(500));
  const playlist = ['#EXTM3U', ...segs.flatMap((_, i) => ['#EXTINF:1,', `s${i}.ts`]), '#EXT-X-ENDLIST'].join('\n');
  const net = { up: true };
  let fetched = 0;
  const fetchImpl = async (url) => {
    await sleep(5);
    if (!net.up) throw new TypeError('Failed to fetch');
    if (url.endsWith('.m3u8')) return new Response(playlist);
    fetched++;
    return new Response(segs[Number(url.match(/s(\d+)\.ts/)[1])]);
  };
  const gate = makeGate();
  const done = runHlsJob('https://x/p.m3u8', { fetchBytes: makeFetchBytes({ fetchImpl, gate }), gate });
  while (fetched < 5) await sleep(2);
  net.up = false;
  while (!gate.stalled) await sleep(2);
  await sleep(30);
  net.up = true;
  gate.resume();
  const { blob } = await done;
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), Buffer.concat(segs));
});

test('a pause by the user takes over a stall', () => {
  const gate = makeGate();
  gate.stall();
  assert.ok(gate.paused && gate.stalled);
  gate.pause();
  assert.ok(gate.paused && !gate.stalled, 'a retry must not resume what the user paused');
  gate.stall();
  assert.ok(!gate.stalled, 'a stall does not override a pause');
  gate.resume();
  assert.ok(!gate.paused && !gate.stalled);
});
