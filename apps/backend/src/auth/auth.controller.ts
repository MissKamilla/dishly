import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  createAuthCookieOptions,
  createClearAuthCookieOptions,
} from './auth.config';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser, PublicUser } from './types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Public()
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicUser> {
    const result = await this.authService.register(registerDto);

    response.cookie(
      AUTH_COOKIE_NAME,
      result.accessToken,
      createAuthCookieOptions(this.configService),
    );

    return result.user;
  }

  @Post('login')
  @HttpCode(200)
  @Public()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicUser> {
    const result = await this.authService.login(loginDto);

    response.cookie(
      AUTH_COOKIE_NAME,
      result.accessToken,
      createAuthCookieOptions(this.configService),
    );

    return result.user;
  }

  @Post('logout')
  @HttpCode(204)
  @Public()
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(
      AUTH_COOKIE_NAME,
      createClearAuthCookieOptions(this.configService),
    );
  }

  @Get('current')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.authService.getCurrentUser(user.id);
  }
}
