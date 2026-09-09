import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from './config/validate-environment';
import { createRuntimeDatabaseOptions } from './database/typeorm.config';
import { HealthController } from './health.controller';
import { RecipesModule } from './recipes/recipes.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createRuntimeDatabaseOptions((name) =>
          configService.getOrThrow<string>(name),
        ),
    }),
    RecipesModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
