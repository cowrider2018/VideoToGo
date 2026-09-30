// Text in the browser's language, from _locales/<lang>/messages.json.
//
// The offscreen document gets chrome.runtime only, and inject/mse-hook.js runs in the page's
// own world with no extension API at all. There a message stays a token, "__MSG_<name>__"
// followed by "|<substitution>" parts, and localize() turns it into text where it is shown.
const TOKEN = /^__MSG_(\w+)__((?:\|[^|]*)*)$/;

export function t(name, ...subs) {
  const text = globalThis.chrome?.i18n?.getMessage(name, subs.map(String));
  return text || [`__MSG_${name}__`, ...subs].join('|');
}

// A token from a context without chrome.i18n as text; anything else as it is.
export function localize(text) {
  const m = typeof text === 'string' && TOKEN.exec(text);
  if (!m || !globalThis.chrome?.i18n) return text;
  return t(m[1], ...m[2].split('|').slice(1));
}
