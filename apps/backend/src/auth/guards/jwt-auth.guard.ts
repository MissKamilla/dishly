import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME, IS_PUBLIC_ROUTE_KEY } from '../auth.constants';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
  JwtPayload,
} from '../types/auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublicRoute(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.getTokenFromCookie(request);

    request.user = await this.verifyToken(token);

    return true;
  }

  private isPublicRoute(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private getTokenFromCookie(request: Request): string {
    const cookies = request.cookies as unknown;

    if (!this.isRecord(cookies)) {
      throw this.createUnauthorizedException();
    }

    const token = cookies[AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw this.createUnauthorizedException();
    }

    return token;
  }

  private async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload: unknown = await this.jwtService.verifyAsync(token);

      if (!this.isValidJwtPayload(payload)) {
        throw this.createUnauthorizedException();
      }

      return {
        id: payload.sub,
      };
    } catch {
      throw this.createUnauthorizedException();
    }
  }

  private isValidJwtPayload(payload: unknown): payload is JwtPayload {
    if (!this.isRecord(payload)) {
      return false;
    }

    const sub = payload.sub;

    return Number.isInteger(sub) && typeof sub === 'number' && sub > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private createUnauthorizedException(): UnauthorizedException {
    return new UnauthorizedException('Authentication required');
  }
}
