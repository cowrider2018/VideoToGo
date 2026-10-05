// Request headers captured from the page's own media requests, so a download can present
// the same identity (cookies, referer, auth tokens, custom player headers).

// Transport and caching details that must not be copied onto a different request, and
// headers the browser adds on its own (to Google domains, prefetches), which a script
// setting them would turn into a CORS preflight the server refuses.
const SKIP = new Set([
  'host', 'connection', 'keep-alive', 'proxy-connection', 'te', 'priority', 'content-length',
  'accept-encoding', 'range', 'if-range', 'if-none-match', 'if-modified-since', 'cache-control',
  'pragma', 'upgrade-insecure-requests', 'user-agent', 'x-client-data', 'purpose',
]);

// webRequest header list -> { lowercased name: value } worth replaying.
export function identityHeaders(requestHeaders = []) {
  const out = {};
  for (const { name, value } of requestHeaders) {
    const n = name.toLowerCase();
    if (value == null || SKIP.has(n) || n.startsWith('sec-') || n.startsWith('x-browser-')) continue;
    out[n] = value;
  }
  return out;
}

// fetch() refuses to set these; inside the page the browser supplies its own anyway.
const FORBIDDEN = new Set([
  'cookie', 'cookie2', 'referer', 'origin', 'accept-charset', 'dnt', 'date', 'expect', 'via',
  'trailer', 'transfer-encoding', 'upgrade', 'access-control-request-headers',
  'access-control-request-method',
]);

// The subset a script running in the page may set on its own fetch().
export function pageHeaders(headers = {}) {
  const out = {};
  for (const [n, v] of Object.entries(headers)) {
    if (!FORBIDDEN.has(n) && !n.startsWith('proxy-')) out[n] = v;
  }
  return out;
}

// Remembers `headers` as what was last sent to `host`, in place. Hosts are kept in the order
// they last changed, and past `max` the oldest go: a tab that keeps navigating meets new hosts
// on every page, and the whole record is copied into each download it queues. Returns
// whether anything changed.
export function rememberHost(ids, host, headers, max) {
  if (JSON.stringify(ids[host]) === JSON.stringify(headers)) return false;
  delete ids[host];
  ids[host] = headers;
  const hosts = Object.keys(ids);
  for (const old of hosts.slice(0, Math.max(0, hosts.length - max))) delete ids[old];
  return true;
}
