import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { SpecializationDto } from './dto/specialization.dto';
import { SpecializationsService } from './specializations.service';

@ApiTags('specializations')
@Controller('specializations')
export class SpecializationsController {
  constructor(private readonly specializations: SpecializationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all specializations (public; used by doctor registration)' })
  @ApiOkResponse({ type: SpecializationDto, isArray: true })
  list(): Promise<SpecializationDto[]> {
    return this.specializations.list();
  }
}
