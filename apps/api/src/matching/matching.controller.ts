import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ACCESS_COOKIE } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import {
  SuggestMatchDto,
  SuggestMatchResponseDto,
  SymptomsByCategoryDto,
} from './dto/matching.dto';
import { MatchingService } from './matching.service';

@ApiTags('matching')
@ApiCookieAuth(ACCESS_COOKIE)
@Roles(Role.PATIENT)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('symptoms')
  @ApiOperation({ summary: 'List all symptoms, grouped by category' })
  @ApiOkResponse({ type: SymptomsByCategoryDto, isArray: true })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN' })
  listSymptoms(): Promise<SymptomsByCategoryDto[]> {
    return this.matching.listSymptoms();
  }

  @Post('suggest')
  @ApiOperation({
    summary: 'Suggest specializations and doctors from selected symptoms/description',
  })
  @ApiOkResponse({ type: SuggestMatchResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN' })
  suggest(@Body() dto: SuggestMatchDto): Promise<SuggestMatchResponseDto> {
    return this.matching.suggest(dto);
  }
}
