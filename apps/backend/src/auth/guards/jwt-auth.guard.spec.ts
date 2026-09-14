jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME } from '../auth.constants';
import type { AuthenticatedRequest } from '../types/auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let reflector: {
    getAllAndOverride: jest.Mock;
  };
  let jwtService: {
    verifyAsync: jest.Mock;
  };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    jwtService = {
      verifyAsync: jest.fn(),
    };
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
    );
  });

  it('passes public routes without reading a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);

    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('passes valid cookie token and stores authenticated user on request', async () => {
    const request: AuthenticatedRequest = {
      cookies: {
        [AUTH_COOKIE_NAME]: 'valid-token',
      },
    } as AuthenticatedRequest;
    jwtService.verifyAsync.mockResolvedValue({ sub: 42 });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({ id: 42 });
  });

  it('rejects missing token', async () => {
    await expect(
      guard.canActivate(createContext({ cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(
      guard.canActivate(
        createContext({
          cookies: {
            [AUTH_COOKIE_NAME]: 'invalid-token',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(
      guard.canActivate(
        createContext({
          cookies: {
            [AUTH_COOKIE_NAME]: 'expired-token',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token with invalid payload', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: '42' });

    await expect(
      guard.canActivate(
        createContext({
          cookies: {
            [AUTH_COOKIE_NAME]: 'bad-payload-token',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => createContext,
    getClass: () => JwtAuthGuard,
  } as ExecutionContext;
}
