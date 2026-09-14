jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));
jest.mock('../users/entities/user.entity', () => ({
  User: class User {},
}));
jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {},
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { User } from '../users/entities/user.entity';
import { DuplicateUserEmailError } from '../users/errors/duplicate-user-email.error';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let usersService: {
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };
  let passwordService: {
    hashPassword: jest.Mock;
    verifyPassword: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    passwordService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };
    authService = new AuthService(
      usersService as unknown as UsersService,
      passwordService,
      jwtService as unknown as JwtService,
    );
  });

  it('registers a user with a password hash and returns public user plus token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    passwordService.hashPassword.mockResolvedValue('argon2-hash');
    usersService.create.mockResolvedValue(
      createUser({
        id: 1,
        email: 'test@example.com',
        name: 'Kamilla',
      }),
    );
    jwtService.signAsync.mockResolvedValue('signed-token');

    const result = await authService.register({
      email: ' TEST@Example.COM ',
      password: 'password123',
      name: 'Kamilla',
    });

    expect(passwordService.hashPassword).toHaveBeenCalledWith('password123');
    expect(usersService.create).toHaveBeenCalledWith({
      email: ' TEST@Example.COM ',
      passwordHash: 'argon2-hash',
      name: 'Kamilla',
    });
    expect(usersService.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'password123',
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 1 });
    expect(result).toEqual({
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Kamilla',
        language: 'en',
      },
      accessToken: 'signed-token',
    });
  });

  it('rejects duplicate email before hashing a password', async () => {
    usersService.findByEmail.mockResolvedValue(createUser());

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Kamilla',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(passwordService.hashPassword).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('converts database duplicate email errors to conflict', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    passwordService.hashPassword.mockResolvedValue('argon2-hash');
    usersService.create.mockRejectedValue(new DuplicateUserEmailError());

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Kamilla',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with correct credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(
      createUser({ passwordHash: 'argon2-hash' }),
    );
    passwordService.verifyPassword.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(passwordService.verifyPassword).toHaveBeenCalledWith(
      'password123',
      'argon2-hash',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 1 });
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Kamilla',
      language: 'en',
    });
  });

  it('uses the same unauthorized error for unknown email and wrong password', async () => {
    usersService.findByEmailWithPassword.mockResolvedValueOnce(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: 'Invalid email or password',
    });

    usersService.findByEmailWithPassword.mockResolvedValueOnce(
      createUser({ passwordHash: 'argon2-hash' }),
    );
    passwordService.verifyPassword.mockResolvedValue(false);

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'wrongpass',
      }),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: 'Invalid email or password',
    });
  });
});

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'argon2-hash',
    name: 'Kamilla',
    language: 'en',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    recipes: [],
    ...overrides,
  };
}
