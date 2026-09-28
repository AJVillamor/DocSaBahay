import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { ApiErrorDto } from '../common/errors/api-error.dto';
import { AuthCookieService } from './auth-cookie.service';
import { AccountInactiveException, InvalidRefreshTokenException } from './auth.exceptions';
import { AuthService, AuthSession } from './auth.service';
import { ACCESS_COOKIE, AuthUser, readCookie, REFRESH_COOKIE } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto, RegisterDoctorDto, RegisterPatientDto } from './dto/auth.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Post('register/patient')
  @ApiOperation({ summary: 'Register a patient account and sign in' })
  @ApiCreatedResponse({ type: MeResponseDto, description: 'Signed in; auth cookies set.' })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'EMAIL_TAKEN' })
  async registerPatient(
    @Body() dto: RegisterPatientDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponseDto> {
    return this.signedIn(response, await this.auth.registerPatient(dto));
  }

  @Public()
  @Post('register/doctor')
  @ApiOperation({ summary: 'Register a doctor account (PENDING review) and sign in' })
  @ApiCreatedResponse({ type: MeResponseDto, description: 'Signed in; auth cookies set.' })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'EMAIL_TAKEN' })
  async registerDoctor(
    @Body() dto: RegisterDoctorDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponseDto> {
    return this.signedIn(response, await this.auth.registerDoctor(dto));
  }

  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: MeResponseDto, description: 'Signed in; auth cookies set.' })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'ACCOUNT_INACTIVE' })
  @ApiTooManyRequestsResponse({
    type: ApiErrorDto,
    description: 'TOO_MANY_REQUESTS (5 attempts per minute per IP + email)',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponseDto> {
    return this.signedIn(response, await this.auth.login(dto));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiOkResponse({ type: MeResponseDto, description: 'New auth cookies set.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorDto,
    description: 'INVALID_REFRESH_TOKEN (a reused token also revokes its whole family)',
  })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'ACCOUNT_INACTIVE' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponseDto> {
    const token = readCookie(request, REFRESH_COOKIE);
    try {
      if (!token) {
        throw new InvalidRefreshTokenException();
      }
      return this.signedIn(response, await this.auth.refresh(token));
    } catch (error) {
      if (
        error instanceof InvalidRefreshTokenException ||
        error instanceof AccountInactiveException
      ) {
        this.cookies.clear(response);
      }
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Revoke the current refresh token and clear auth cookies' })
  @ApiNoContentResponse({ description: 'Signed out.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readCookie(request, REFRESH_COOKIE));
    this.cookies.clear(response);
  }

  @Get('me')
  @ApiCookieAuth(ACCESS_COOKIE)
  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'UNAUTHORIZED' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'ACCOUNT_INACTIVE' })
  me(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.auth.me(user.id);
  }

  private signedIn(response: Response, session: AuthSession): MeResponseDto {
    this.cookies.set(response, session);
    return session.me;
  }
}
