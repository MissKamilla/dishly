export enum RecipeParserErrorCode {
  UNSUPPORTED_URL = 'unsupported_url',
  FETCH_FAILED = 'fetch_failed',
  RECIPE_NOT_FOUND = 'recipe_not_found',
  INVALID_RECIPE_DATA = 'invalid_recipe_data',
}

export class RecipeParserError extends Error {
  constructor(
    readonly code: RecipeParserErrorCode,
    message: string,
    cause: unknown,
    readonly retryable = false,
  ) {
    super(message, { cause });
    this.name = 'RecipeParserError';
  }
}

export function wrapParserError(
  code: RecipeParserErrorCode,
  error: unknown,
  retryable = false,
): RecipeParserError {
  if (error instanceof RecipeParserError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : 'Recipe parsing failed';
  return new RecipeParserError(code, message, error, retryable);
}

export function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const status = /Good Food returned HTTP (\d{3})/.exec(error.message)?.[1];
  if (status) {
    const statusCode = Number(status);
    return statusCode === 429 || statusCode >= 500;
  }

  return [
    'timed out',
    'Failed to fetch Good Food HTML',
    'Failed to resolve Good Food address',
  ].some((message) => error.message.includes(message));
}
