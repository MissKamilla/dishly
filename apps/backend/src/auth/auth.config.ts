import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import type { CookieOptions } from 'express';

const MILLISECONDS_IN_SECOND = 1000;

export function createJwtModuleOptions(
  configService: ConfigService,
): JwtModuleOptions {
  return {
    secret: configService.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: getJwtExpiresInSeconds(configService),
    },
  };
}

export function createAuthCookieOptions(
  configService: ConfigService,
): CookieOptions {
  return {
    ...createBaseAuthCookieOptions(configService),
    maxAge: getJwtExpiresInSeconds(configService) * MILLISECONDS_IN_SECOND,
  };
}

export function createClearAuthCookieOptions(
  configService: ConfigService,
): CookieOptions {
  return createBaseAuthCookieOptions(configService);
}

function createBaseAuthCookieOptions(
  configService: ConfigService,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: configService.getOrThrow<string>('NODE_ENV') === 'production',
  };
}

function getJwtExpiresInSeconds(configService: ConfigService): number {
  return Number.parseInt(
    configService.getOrThrow<string>('JWT_EXPIRES_IN_SECONDS'),
    10,
  );
}
