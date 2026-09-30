// chrome.i18n for the unit tests, answering from the English messages the way Chrome does:
// $name$ placeholders take their content, whose $1…$9 take the substitutions.
import { readFileSync } from 'node:fs';

const messages = JSON.parse(readFileSync(new URL('../_locales/en/messages.json', import.meta.url), 'utf8'));

globalThis.chrome = {
  ...globalThis.chrome,
  i18n: {
    getMessage(name, subs = []) {
      const m = messages[name];
      if (!m) return '';
      const list = [].concat(subs);
      const fill = (s) => s.replace(/\$(\d)/g, (_, n) => list[n - 1] ?? '');
      return m.message.replace(/\$(\w+)\$/g, (_, p) => fill(m.placeholders?.[p.toLowerCase()]?.content ?? ''));
    },
  },
};
