import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { ConsultationNoteResponseDto } from './dto/note-response.dto';
import { NotesService } from './notes.service';

@Controller('notes')
@Roles(Role.PATIENT, Role.DOCTOR)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConsultationNoteResponseDto> {
    return this.notes.getOne(user, id);
  }
}
