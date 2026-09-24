import { load } from 'cheerio';

export function extractJsonLd(html: string): unknown[] {
  const cheerio = load(html);
  const documents: unknown[] = [];
  let hasMalformedScript = false;

  const scripts = cheerio('script[type]').toArray();

  for (const script of scripts) {
    const type = cheerio(script).attr('type')?.trim().toLowerCase();

    if (type !== 'application/ld+json') {
      continue;
    }

    const content = cheerio(script).html();

    if (!content?.trim()) {
      continue;
    }

    try {
      documents.push(JSON.parse(content) as unknown);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      hasMalformedScript = true;
    }
  }

  if (documents.length === 0 && hasMalformedScript) {
    throw new Error('All JSON-LD scripts are malformed');
  }

  return documents;
}
