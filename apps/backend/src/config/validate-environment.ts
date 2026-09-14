const REQUIRED_ENV_VARIABLES = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN_SECONDS',
  'NODE_ENV',
] as const;

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const variableName of REQUIRED_ENV_VARIABLES) {
    const value = config[variableName];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  const jwtExpiresInSecondsValue = config.JWT_EXPIRES_IN_SECONDS;

  if (typeof jwtExpiresInSecondsValue !== 'string') {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer');
  }

  if (!/^[1-9]\d*$/.test(jwtExpiresInSecondsValue)) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer');
  }

  return config;
}
