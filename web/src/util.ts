export const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// À appliquer à toute valeur insérée dans un gabarit HTML
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

export function joinFr(words: string[]) {
  return words.length < 2
    ? words.join('')
    : words.slice(0, -1).join(', ') + ' et ' + words[words.length - 1];
}
