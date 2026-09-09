export type JwtPayload = {
  sub: number;
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
