import {
  normalizeDescription,
  normalizeDurationMinutes,
  normalizeImageUrl,
  normalizeServings,
  normalizeTitle,
} from './recipe.normalizer';

const SOURCE_URL = 'https://www.bbcgoodfood.com/recipes/example';

describe('simple recipe fields', () => {
  it('normalizes a non-empty title', () => {
    expect(normalizeTitle('  Chicken   Pasta  ')).toBe('Chicken Pasta');
  });

  it('extracts safe title text and decodes entities', () => {
    expect(
      normalizeTitle(
        ' <strong>Fish &amp; Chips</strong><script>alert(1)</script> ',
      ),
    ).toBe('Fish & Chips');
  });

  it.each([undefined, null, 42, '', ' \n\t '])(
    'rejects missing or empty title %s',
    (value) => {
      expect(() => normalizeTitle(value)).toThrow('Recipe title is required');
    },
  );

  it('normalizes description whitespace without removing content', () => {
    expect(
      normalizeDescription('  Rich   sauce.\nReady in 30 minutes.  '),
    ).toBe('Rich sauce. Ready in 30 minutes.');
  });

  it('preserves separators between description blocks without executable markup', () => {
    expect(
      normalizeDescription(
        '<p>Heat oil.</p><p>Stir &amp; serve.<br>Enjoy.</p><style>.x{}</style>',
      ),
    ).toBe('Heat oil. Stir & serve. Enjoy.');
  });

  it.each([undefined, null, 42, '  '])(
    'returns null for absent description %s',
    (value) => {
      expect(normalizeDescription(value)).toBeNull();
    },
  );

  it('accepts an absolute image URL', () => {
    expect(normalizeImageUrl('https://example.com/pasta.jpg', SOURCE_URL)).toBe(
      'https://example.com/pasta.jpg',
    );
  });

  it('selects the first valid URL from an array', () => {
    expect(
      normalizeImageUrl(
        ['javascript:alert(1)', '/images/pasta.jpg'],
        SOURCE_URL,
      ),
    ).toBe('https://www.bbcgoodfood.com/images/pasta.jpg');
  });

  it('reads ImageObject.url and resolves a relative URL', () => {
    expect(
      normalizeImageUrl(
        { '@type': 'ImageObject', url: '../pasta.jpg' },
        SOURCE_URL,
      ),
    ).toBe('https://www.bbcgoodfood.com/pasta.jpg');
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'data:image/png;base64,abc',
    'ftp://example.com/image.jpg',
    'https://user:pass@example.com/image.jpg',
  ])('returns null for unsupported image value %s', (value) => {
    expect(normalizeImageUrl(value, SOURCE_URL)).toBeNull();
  });
});

describe('normalizeDurationMinutes', () => {
  it.each([
    ['PT20M', 20],
    ['PT45M', 45],
    ['PT1H30M', 90],
    ['PT2H', 120],
    ['P1DT2H15M', 1575],
    ['PT1.5H', 90],
    ['PT1,25H', 75],
    ['P0.5D', 720],
    ['PT120S', 2],
    ['PT14M30S', 15],
    ['PT30S', 1],
    ['PT1H30M15S', 91],
    ['PT14M', 14],
    ['PT1H30.5M', 91],
    ['PT0M', 0],
    [' PT15M ', 15],
  ])('converts %s to %i minutes', (value, expected) => {
    expect(normalizeDurationMinutes(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    45,
    '',
    'P',
    'PT',
    'P1DT',
    'P1M',
    'PT1.5H30M',
    'PT-1H',
    'PT1H90X',
    'PT999999999999999999999999H',
  ])('returns null for unsupported duration %s', (value) => {
    expect(normalizeDurationMinutes(value)).toBeNull();
  });
});

describe('normalizeServings', () => {
  it.each([
    ['4', 4],
    [4, 4],
    ['4 servings', 4],
    ['1 serving', 1],
    ['Serves 4', 4],
    ['  SERVES   4  ', 4],
  ])('converts %s to %i servings', (value, expected) => {
    expect(normalizeServings(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    0,
    -2,
    2.5,
    Number.POSITIVE_INFINITY,
    '',
    '0 servings',
    '4-6 servings',
    '4 to 6 servings',
    'serves four',
    '4 people',
    '2.5 servings',
    '999999999999999999999 servings',
    ['4 servings'],
  ])('returns null for ambiguous or invalid servings %s', (value) => {
    expect(normalizeServings(value)).toBeNull();
  });
});
