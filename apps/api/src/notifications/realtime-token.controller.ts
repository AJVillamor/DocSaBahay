import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ACCESS_COOKIE, type AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RealtimeTokenResponseDto } from './dto/realtime-token-response.dto';
import { REALTIME_TOKEN_TTL_SECONDS, RealtimeTokenService } from './realtime-token.service';

@ApiTags('notifications')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('realtime')
export class RealtimeTokenController {
  constructor(private readonly realtimeTokens: RealtimeTokenService) {}

  @Get('token')
  @ApiOperation({
    summary: "Issue a short-lived token to authenticate the caller's socket connection",
  })
  @ApiOkResponse({ type: RealtimeTokenResponseDto })
  async issueToken(@CurrentUser() user: AuthUser): Promise<RealtimeTokenResponseDto> {
    const token = await this.realtimeTokens.signToken(user.id);
    return { token, expiresInSeconds: REALTIME_TOKEN_TTL_SECONDS };
  }
}
