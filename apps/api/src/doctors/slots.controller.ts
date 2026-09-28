import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ACCESS_COOKIE } from '../auth/auth.types';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import { SlotQueryDto, SlotResponseDto } from './dto/slot.dto';
import { InvalidSlotRangeException } from './doctors.exceptions';
import { SlotService } from './slot.service';

/** `from`/`to` may span at most this many days. */
const MAX_RANGE_DAYS = 31;

@ApiTags('doctors')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('doctors/:id/slots')
export class SlotsController {
  constructor(private readonly slots: SlotService) {}

  @Get()
  @ApiOperation({ summary: "List a doctor's free consultation slots between `from` and `to`" })
  @ApiOkResponse({ type: SlotResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  async getSlots(
    @Param('id', ParseUUIDPipe) doctorId: string,
    @Query() query: SlotQueryDto,
  ): Promise<SlotResponseDto[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (!(to > from)) {
      throw new InvalidSlotRangeException('to must be after from.');
    }
    const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new InvalidSlotRangeException(
        `from/to must not span more than ${MAX_RANGE_DAYS} days.`,
      );
    }

    const slots = await this.slots.getFreeSlots(doctorId, from, to);
    return slots.map((slot) => ({
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    }));
  }
}
