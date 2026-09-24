import { load } from 'cheerio';

export function normalizePlainText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const html = load(value, {}, false);
  html('script, style, template').remove();
  html('br').replaceWith(' ');
  html('p, div, li, ul, ol, h1, h2, h3, h4, h5, h6, blockquote').each(
    (_, element) => {
      html(element).before(' ').after(' ');
    },
  );

  return html.root().text().replace(/\s+/g, ' ').trim() || null;
}
