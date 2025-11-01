import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { User } from '../users/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '../shared/cache/cache.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User, Role]),
    CacheModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secret',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, AuthGuard, SequelizeModule], // Export SequelizeModule so Role repository is available
})
export class AuthModule {}
