import { ParsedIngredient } from './types/parsed-recipe';

const SIMPLE_MEASURED_INGREDIENT =
  /^(\d+(?:[.,]\d+)?)\s*(teaspoons?|kilograms?|grams?|mg|kg|g|ml|l|tbsp|tsp)\b\s+(.+)$/i;
const FRACTION_MEASURED_INGREDIENT =
  /^((?:\d+\s+)?\d+\/\d+|(?:\d+\s*)?[¼½¾])\s*(teaspoons?|kilograms?|grams?|mg|kg|g|ml|l|tbsp|tsp)\b\s+(.+)$/i;
const COUNT_INGREDIENT = /^(\d+)\s+(.+)$/;
const MEASUREMENT_PREFIX =
  /^(?:teaspoons?|kilograms?|grams?|mg|kg|g|ml|l|tbsp|tsp|cups?|ounces?|oz|pounds?|lbs?|handfuls?|bunch(?:es)?|pinches?|slices?|cloves?)\b/i;
const NORMALIZED_UNITS: Record<string, string> = {
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
};
const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
};

export function normalizeIngredients(value: unknown): ParsedIngredient[] {
  if (value === null || value === undefined) {
    return [];
  }

  const ingredients: unknown[] = Array.isArray(value) ? value : [value];
  return ingredients.map((ingredient, index) => {
    if (typeof ingredient !== 'string' || !ingredient.trim()) {
      throw new Error(
        `Recipe ingredient at position ${index + 1} must be a non-empty string`,
      );
    }

    return parseIngredient(ingredient);
  });
}

function parseIngredient(rawText: string): ParsedIngredient {
  const text = rawText.trim();
  const measured =
    SIMPLE_MEASURED_INGREDIENT.exec(text) ??
    FRACTION_MEASURED_INGREDIENT.exec(text);
  if (measured) {
    return buildIngredient(rawText, measured[1], measured[3], measured[2]);
  }

  const counted = COUNT_INGREDIENT.exec(text);
  if (counted && !MEASUREMENT_PREFIX.test(counted[2].trim())) {
    return buildIngredient(rawText, counted[1], counted[2], null);
  }

  return { rawText, name: null, quantity: null, unit: null };
}

function buildIngredient(
  rawText: string,
  quantityText: string,
  nameText: string,
  unit: string | null,
): ParsedIngredient {
  const quantity = parseQuantity(quantityText);
  const name = nameText.trim().replace(/\s+/g, ' ');
  if (
    quantity === null ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > Number.MAX_SAFE_INTEGER ||
    !name
  ) {
    return { rawText, name: null, quantity: null, unit: null };
  }

  return {
    rawText,
    name,
    quantity,
    unit: unit
      ? (NORMALIZED_UNITS[unit.toLowerCase()] ?? unit.toLowerCase())
      : null,
  };
}

function parseQuantity(value: string): number | null {
  const slashFraction = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(value);
  if (slashFraction) {
    const whole = Number(slashFraction[1] ?? 0);
    const numerator = Number(slashFraction[2]);
    const denominator = Number(slashFraction[3]);
    if (
      !Number.isSafeInteger(whole) ||
      !Number.isSafeInteger(numerator) ||
      !Number.isSafeInteger(denominator) ||
      denominator === 0
    ) {
      return null;
    }

    return whole + numerator / denominator;
  }

  const unicodeFraction = /^(\d*)\s*([¼½¾])$/.exec(value);
  if (unicodeFraction) {
    const whole = Number(unicodeFraction[1] || 0);
    return Number.isSafeInteger(whole)
      ? whole + UNICODE_FRACTIONS[unicodeFraction[2]]
      : null;
  }

  return Number(value.replace(',', '.'));
}
