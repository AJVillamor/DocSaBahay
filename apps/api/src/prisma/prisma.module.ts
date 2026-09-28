import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/** Makes `PrismaService` available to every module without importing it. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
