import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AdminModule } from './admin/admin.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { ConsultationsModule } from './consultations/consultations.module';
import { DoctorsModule } from './doctors/doctors.module';
import { HealthModule } from './health/health.module';
import { MatchingModule } from './matching/matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecordsModule } from './records/records.module';
import { SpecializationsModule } from './specializations/specializations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    // Root-level like ConfigModule: appointment events are emitted here and will be
    // consumed by a later, separate notifications module.
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    HealthModule,
    PatientsModule,
    SpecializationsModule,
    DoctorsModule,
    MatchingModule,
    AppointmentsModule,
    ConsultationsModule,
    NotificationsModule,
    RecordsModule,
    AdminModule,
  ],
})
export class AppModule {}
