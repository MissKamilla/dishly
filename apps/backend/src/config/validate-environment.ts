const REQUIRED_ENV_VARIABLES = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN_SECONDS',
  'NODE_ENV',
  'REDIS_HOST',
  'REDIS_PORT',
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

  validateTcpPort(config.REDIS_PORT, 'REDIS_PORT');

  return config;
}

function validateTcpPort(value: unknown, name: string): void {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a valid TCP port`);
  }

  const port = Number.parseInt(value, 10);

  if (port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }
}
