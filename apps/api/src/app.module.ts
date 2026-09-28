import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { DoctorsModule } from './doctors/doctors.module';
import { HealthModule } from './health/health.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/prisma.module';
import { SpecializationsModule } from './specializations/specializations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    HealthModule,
    PatientsModule,
    SpecializationsModule,
    DoctorsModule,
  ],
})
export class AppModule {}
