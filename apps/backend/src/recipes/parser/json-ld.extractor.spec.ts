import { extractJsonLd } from './json-ld.extractor';
import { findRecipeInJsonLd } from './json-ld.recipe-finder';

describe('extractJsonLd', () => {
  it('parses every JSON-LD script in document order', () => {
    const html = `
      <script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
      <script type="application/ld+json">{"@type":"Recipe","name":"Pasta"}</script>
    `;

    expect(extractJsonLd(html)).toEqual([
      { '@type': 'BreadcrumbList' },
      { '@type': 'Recipe', name: 'Pasta' },
    ]);
  });

  it('ignores non-JSON-LD scripts and empty JSON-LD scripts', () => {
    const html = `
      <script>throw new Error('JavaScript must not run')</script>
      <script type="application/json">{"ignored":true}</script>
      <script type="application/ld+json">  </script>
    `;

    expect(extractJsonLd(html)).toEqual([]);
  });

  it('accepts case and surrounding whitespace in the type attribute', () => {
    const html = '<script type=" APPLICATION/LD+JSON ">[1,2]</script>';

    expect(extractJsonLd(html)).toEqual([[1, 2]]);
  });

  it('skips malformed JSON-LD and keeps a later valid Recipe', () => {
    const html = `
      <script type="application/ld+json">{"@type":</script>
      <script type="application/ld+json">{"@type":"Recipe","name":"Soup"}</script>
    `;

    const documents = extractJsonLd(html);

    expect(findRecipeInJsonLd(documents)).toEqual({
      '@type': 'Recipe',
      name: 'Soup',
    });
  });

  it('keeps valid JSON-LD before a malformed script', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Recipe"}</script>
      <script type="application/ld+json">not JSON</script>
    `;

    expect(extractJsonLd(html)).toEqual([{ '@type': 'Recipe' }]);
  });

  it('reports when all non-empty JSON-LD scripts are malformed', () => {
    const html = `
      <script type="application/ld+json">{"@type":</script>
      <script type="application/ld+json">not JSON</script>
    `;

    expect(() => extractJsonLd(html)).toThrow(
      'All JSON-LD scripts are malformed',
    );
  });
});
