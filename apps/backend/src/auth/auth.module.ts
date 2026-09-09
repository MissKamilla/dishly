import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number.parseInt(
            configService.getOrThrow<string>('JWT_EXPIRES_IN_SECONDS'),
            10,
          ),
        },
      }),
    }),
  ],
  providers: [AuthService, PasswordService],
})
export class AuthModule {}
