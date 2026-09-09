const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

export function isPostgresUniqueViolation(
  error: unknown,
  constraintName?: string,
): boolean {
  const postgresError = getPostgresError(error);

  if (!postgresError) {
    return false;
  }

  const isUniqueViolation =
    postgresError.code === POSTGRES_UNIQUE_VIOLATION_CODE;

  if (!constraintName) {
    return isUniqueViolation;
  }

  return isUniqueViolation && postgresError.constraint === constraintName;
}

function getPostgresError(error: unknown): Record<string, unknown> | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.code === 'string') {
    return error;
  }

  const driverError = error.driverError;

  if (isRecord(driverError)) {
    return driverError;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
