import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SpecializationDto } from './dto/specialization.dto';

@Injectable()
export class SpecializationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists every specialization, sorted by name. */
  list(): Promise<SpecializationDto[]> {
    return this.prisma.specialization.findMany({
      select: { id: true, name: true, slug: true, description: true },
      orderBy: { name: 'asc' },
    });
  }
}
