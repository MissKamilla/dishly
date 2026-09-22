const GOOD_FOOD_HOSTNAMES = new Set(['bbcgoodfood.com', 'www.bbcgoodfood.com']);

export function validateGoodFoodUrl(input: string): URL {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid Good Food URL');
  }

  if (
    url.protocol !== 'https:' ||
    !GOOD_FOOD_HOSTNAMES.has(url.hostname) ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error('Unsupported Good Food URL');
  }

  return url;
}
