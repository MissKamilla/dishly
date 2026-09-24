import { normalizeSteps } from './step.normalizer';

describe('normalizeSteps', () => {
  const sourceUrl = 'https://www.bbcgoodfood.com/recipes/soup';

  it('normalizes HowToStep and text instructions in source order', () => {
    expect(
      normalizeSteps(
        [
          { '@type': 'HowToStep', text: ' Heat the oil. ' },
          ' Add the onions. ',
          { '@type': ['Thing', 'HowToStep'], text: 'Stir and serve.' },
        ],
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Heat the oil.',
        group: null,
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Add the onions.',
        group: null,
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Stir and serve.',
        group: null,
        durationMinutes: null,
        imageUrl: null,
      },
    ]);
  });

  it('assigns section names while preserving source order', () => {
    expect(
      normalizeSteps(
        [
          { '@type': 'HowToStep', text: 'Prepare vegetables.' },
          {
            '@type': 'HowToSection',
            name: 'For the sauce',
            itemListElement: [
              { '@type': 'HowToStep', text: 'Add the cream.' },
              'Simmer.',
            ],
          },
          { '@type': 'HowToStep', text: 'Serve.' },
        ],
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Prepare vegetables.',
        group: null,
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Add the cream.',
        group: 'For the sauce',
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Simmer.',
        group: 'For the sauce',
        durationMinutes: null,
        imageUrl: null,
      },
      { text: 'Serve.', group: null, durationMinutes: null, imageUrl: null },
    ]);
  });

  it('uses the innermost named section and inherits through unnamed sections', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToSection',
          name: '  For the   sauce ',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Prepare.' },
            {
              '@type': 'HowToSection',
              name: '  ',
              itemListElement: [{ '@type': 'HowToStep', text: 'Stir.' }],
            },
            {
              '@type': 'HowToSection',
              name: 'Finish',
              itemListElement: [{ '@type': 'HowToStep', text: 'Serve.' }],
            },
          ],
        },
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Prepare.',
        group: 'For the sauce',
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Stir.',
        group: 'For the sauce',
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Serve.',
        group: 'Finish',
        durationMinutes: null,
        imageUrl: null,
      },
    ]);
  });

  it('does not invent a group for a nameless top-level section', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToSection',
          itemListElement: [{ '@type': 'HowToStep', text: 'Mix.' }],
        },
        sourceUrl,
      ),
    ).toEqual([
      { text: 'Mix.', group: null, durationMinutes: null, imageUrl: null },
    ]);
  });

  it('extracts safe text from a section name', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToSection',
          name: '<b>For the sauce</b><script>alert("unsafe")</script>',
          itemListElement: [{ '@type': 'HowToStep', text: 'Mix.' }],
        },
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Mix.',
        group: 'For the sauce',
        durationMinutes: null,
        imageUrl: null,
      },
    ]);
  });

  it('normalizes structured duration and image on a HowToStep', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToStep',
          text: 'Cook until golden.',
          duration: 'PT14M30S',
          image: { url: '/images/golden.jpg' },
        },
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Cook until golden.',
        group: null,
        durationMinutes: 15,
        imageUrl: 'https://www.bbcgoodfood.com/images/golden.jpg',
      },
    ]);
  });

  it('extracts safe step text while preserving block separators', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToStep',
          text: '<p>Heat oil.</p><p>Add <b>onions</b> &amp; stir.<br>Serve.</p><script>alert(1)</script>',
        },
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Heat oil. Add onions & stir. Serve.',
        group: null,
        durationMinutes: null,
        imageUrl: null,
      },
    ]);
  });

  it('keeps invalid structured metadata null without guessing from text', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToStep',
          text: 'Fry for 8-10 minutes.',
          duration: '8-10 minutes',
          image: 'javascript:alert(1)',
        },
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Fry for 8-10 minutes.',
        group: null,
        durationMinutes: null,
        imageUrl: null,
      },
    ]);
  });

  it('normalizes metadata on a step inside a section', () => {
    expect(
      normalizeSteps(
        {
          '@type': 'HowToSection',
          name: 'For the sauce',
          itemListElement: [
            {
              '@type': 'HowToStep',
              text: 'Stir.',
              duration: 'PT30S',
              image: ['javascript:alert(1)', 'https://example.com/stir.jpg'],
            },
          ],
        },
        sourceUrl,
      ),
    ).toEqual([
      {
        text: 'Stir.',
        group: 'For the sauce',
        durationMinutes: 1,
        imageUrl: 'https://example.com/stir.jpg',
      },
    ]);
  });

  it('accepts a single instruction and ignores unusable entries', () => {
    expect(
      normalizeSteps({ '@type': 'HowToStep', text: 'Mix.' }, sourceUrl),
    ).toHaveLength(1);
    expect(
      normalizeSteps(
        [null, '', { '@type': 'HowToStep', text: ' ' }, 42],
        sourceUrl,
      ),
    ).toEqual([]);
  });
});
