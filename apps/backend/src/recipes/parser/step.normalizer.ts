import { ParsedRecipeStep } from './types/parsed-recipe';
import { normalizePlainText } from './plain-text.normalizer';
import {
  normalizeDurationMinutes,
  normalizeImageUrl,
} from './recipe.normalizer';

export function normalizeSteps(
  value: unknown,
  sourceUrl: string,
): ParsedRecipeStep[] {
  return normalizeInstruction(value, null, sourceUrl);
}

function normalizeInstruction(
  value: unknown,
  group: string | null,
  sourceUrl: string,
): ParsedRecipeStep[] {
  if (Array.isArray(value)) {
    return value.flatMap((instruction) =>
      normalizeInstruction(instruction, group, sourceUrl),
    );
  }

  if (typeof value === 'string') {
    return createStep(value, group, sourceUrl);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const instruction = value as Record<string, unknown>;
  const types = instruction['@type'];
  if (
    types === 'HowToSection' ||
    (Array.isArray(types) && types.includes('HowToSection'))
  ) {
    return normalizeSection(instruction, group, sourceUrl);
  }
  if (
    types === 'HowToStep' ||
    (Array.isArray(types) && types.includes('HowToStep'))
  ) {
    return createStep(instruction.text, group, sourceUrl, instruction);
  }

  return [];
}

function normalizeSection(
  section: Record<string, unknown>,
  parentGroup: string | null,
  sourceUrl: string,
): ParsedRecipeStep[] {
  const name = section.name;
  const group =
    typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  return normalizeInstruction(
    section.itemListElement,
    group || parentGroup,
    sourceUrl,
  );
}

function createStep(
  value: unknown,
  group: string | null,
  sourceUrl: string,
  instruction?: Record<string, unknown>,
): ParsedRecipeStep[] {
  const text = normalizePlainText(value);
  if (!text) {
    return [];
  }

  return [
    {
      text,
      group,
      durationMinutes: normalizeDurationMinutes(instruction?.duration),
      imageUrl: normalizeImageUrl(instruction?.image, sourceUrl),
    },
  ];
}
