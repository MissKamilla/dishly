import type { Request } from 'express';

export type JwtPayload = {
  sub: number;
};

export type AuthenticatedUser = {
  id: number;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export type PublicUser = {
  id: number;
  email: string;
  name: string;
  language: string;
};

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
};
