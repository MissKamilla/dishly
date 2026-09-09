import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DuplicateUserEmailError } from '../users/errors/duplicate-user-email.error';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { AuthResult, JwtPayload, PublicUser } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw this.createDuplicateEmailException();
    }

    const passwordHash = await this.passwordService.hashPassword(
      registerDto.password,
    );

    try {
      const user = await this.usersService.create({
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
      });

      return {
        user: this.toPublicUser(user),
        accessToken: await this.createAccessToken(user.id),
      };
    } catch (error) {
      if (error instanceof DuplicateUserEmailError) {
        throw this.createDuplicateEmailException();
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    if (!user) {
      throw this.createInvalidCredentialsException();
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw this.createInvalidCredentialsException();
    }

    return {
      user: this.toPublicUser(user),
      accessToken: await this.createAccessToken(user.id),
    };
  }

  private async createAccessToken(userId: number): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
    };

    return this.jwtService.signAsync(payload);
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
    };
  }

  private createDuplicateEmailException(): ConflictException {
    return new ConflictException('Email is already registered');
  }

  private createInvalidCredentialsException(): UnauthorizedException {
    return new UnauthorizedException('Invalid email or password');
  }
}
