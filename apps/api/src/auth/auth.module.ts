import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { Env } from '../config/env';
import { AuthCookieService } from './auth-cookie.service';
import { AuthStateService } from './auth-state.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LOGIN_THROTTLE, LoginThrottlerGuard } from './guards/login-throttler.guard';
import { RolesGuard } from './guards/roles.guard';
import { TokenService } from './token.service';

/**
 * Registration, sign-in and session management. Registers `JwtAuthGuard` and
 * `RolesGuard` globally (in that order), so every route is private by default.
 */
const JwtModuleConfig = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => ({
    secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
    signOptions: { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    verifyOptions: { algorithms: ['HS256'] },
  }),
});

@Module({
  imports: [JwtModuleConfig, ThrottlerModule.forRoot([LOGIN_THROTTLE])],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    AuthStateService,
    AuthCookieService,
    LoginThrottlerGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  // JwtModule is re-exported so other modules (e.g. NotificationsModule, for its
  // short-lived realtime-token JWTs) can share this same JwtService instance and
  // JWT_ACCESS_SECRET config rather than standing up a second, parallel one.
  exports: [AuthStateService, JwtModuleConfig],
})
export class AuthModule {}
