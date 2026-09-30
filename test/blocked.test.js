import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLOCKED_MATCHES, isBlocked } from '../lib/blocked.js';

test('isBlocked covers YouTube, its embeds and the hosts its media comes from', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=abc',
    'https://youtube.com/',
    'https://m.youtube.com/shorts/abc',
    'https://music.youtube.com/',
    'https://youtu.be/abc',
    'https://www.youtube-nocookie.com/embed/abc',
    'https://youtube.googleapis.com/v/abc',
    'https://www.youtubekids.com/',
    'https://rr3---sn-abc.googlevideo.com/videoplayback?id=1',
    'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    'https://WWW.YouTube.COM/',
    'https://www.youtube.com./',
    'https://www.youtube.com', // an initiator: an origin without a path
  ]) {
    assert.equal(isBlocked(url), true, url);
  }
});

test('isBlocked leaves other sites alone, look-alikes included', () => {
  for (const url of [
    'https://example.com/v.mp4',
    'https://notyoutube.com/',
    'https://youtube.com.example.com/',
    'https://example.com/?next=https://www.youtube.com/',
    'https://www.googleapis.com/',
    'mse:0:abc',
    '',
    undefined,
  ]) {
    assert.equal(isBlocked(url), false, String(url));
  }
});

test('BLOCKED_MATCHES are match patterns for every blocked domain', () => {
  assert.ok(BLOCKED_MATCHES.includes('*://*.youtube.com/*'));
  assert.ok(BLOCKED_MATCHES.includes('*://*.googlevideo.com/*'));
  for (const p of BLOCKED_MATCHES) assert.match(p, /^\*:\/\/\*\.[a-z0-9.-]+\/\*$/);
});
