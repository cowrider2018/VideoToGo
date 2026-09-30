// Sites this extension does not download from: YouTube, its embedded player and the hosts
// its videos and thumbnails come from. Nothing is detected in their pages or frames, nothing
// they serve is listed, and no download starts from them; the sites still browse normally in
// the viewer.
export const BLOCKED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'youtube.googleapis.com',
  'youtubekids.com',
  'googlevideo.com',
  'ytimg.com',
];

// The domains, or any subdomain of them.
export function isBlocked(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return false;
  }
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// Match patterns for the same sites ("*." covers the domain itself too), for excludeMatches.
export const BLOCKED_MATCHES = BLOCKED_DOMAINS.map((d) => `*://*.${d}/*`);
