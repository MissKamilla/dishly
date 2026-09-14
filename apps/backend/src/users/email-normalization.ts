export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function transformEmail(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return normalizeEmail(value);
}
