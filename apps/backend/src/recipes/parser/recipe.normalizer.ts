const ISO_RECIPE_DURATION =
  /^P(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/;

export function normalizeTitle(value: unknown): string {
  const title = normalizeText(value);
  if (!title) {
    throw new Error('Recipe title is required');
  }

  return title;
}

export function normalizeDescription(value: unknown): string | null {
  return normalizeText(value);
}

export function normalizeImageUrl(
  value: unknown,
  sourceUrl: string,
): string | null {
  const candidates = Array.isArray(value) ? value : [value];

  for (const candidate of candidates) {
    const imageUrl = getImageUrl(candidate);
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
      continue;
    }

    try {
      const url = new URL(imageUrl.trim(), sourceUrl);
      if (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        !url.username &&
        !url.password
      ) {
        return url.href;
      }
    } catch {
      // Ignore an invalid candidate and try the next image.
    }
  }

  return null;
}

export function normalizeDurationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const duration = value.trim();
  const match = ISO_RECIPE_DURATION.exec(duration);
  if (!match) {
    return null;
  }

  const [, days, hours, minutes, seconds] = match;
  if (
    (days === undefined &&
      hours === undefined &&
      minutes === undefined &&
      seconds === undefined) ||
    (duration.includes('T') &&
      hours === undefined &&
      minutes === undefined &&
      seconds === undefined)
  ) {
    return null;
  }

  const components = [days, hours, minutes, seconds].filter(
    (component): component is string => component !== undefined,
  );
  if (components.slice(0, -1).some((component) => /[.,]/.test(component))) {
    return null;
  }

  const totalMinutes =
    toNumber(days) * 24 * 60 +
    toNumber(hours) * 60 +
    toNumber(minutes) +
    toNumber(seconds) / 60;

  const roundedMinutes = Math.ceil(totalMinutes);
  return Number.isSafeInteger(roundedMinutes) ? roundedMinutes : null;
}

export function normalizeServings(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim().replace(/\s+/g, ' ');
  const match = /^(?:(\d+)(?: servings?)?|serves (\d+))$/i.exec(text);
  if (!match) {
    return null;
  }

  const servings = Number(match[1] ?? match[2]);
  return Number.isSafeInteger(servings) && servings > 0 ? servings : null;
}

function toNumber(component: string | undefined): number {
  return component ? Number(component.replace(',', '.')) : 0;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value.replace(/\s+/g, ' ').trim() || null;
}

function getImageUrl(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  return (value as Record<string, unknown>).url;
}
