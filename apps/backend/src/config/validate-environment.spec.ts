import { validateEnvironment } from './validate-environment';

const validConfig = {
  JWT_SECRET: 'secret',
  JWT_EXPIRES_IN_SECONDS: '86400',
  NODE_ENV: 'development',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6380',
};

describe('validateEnvironment', () => {
  it('accepts valid Redis connection variables', () => {
    expect(validateEnvironment(validConfig)).toBe(validConfig);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
  ])('rejects %s REDIS_HOST', (_caseName, redisHost) => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        REDIS_HOST: redisHost,
      }),
    ).toThrow('Missing required environment variable: REDIS_HOST');
  });

  it.each(['abc', '0', '70000', '6380abc'])(
    'rejects invalid REDIS_PORT value %s',
    (redisPort) => {
      expect(() =>
        validateEnvironment({
          ...validConfig,
          REDIS_PORT: redisPort,
        }),
      ).toThrow('REDIS_PORT must be a valid TCP port');
    },
  );
});
