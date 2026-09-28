import { Module } from '@nestjs/common';

import { ConsultationsModule } from '../consultations/consultations.module';
import { ConsultationRecordsController } from './consultation-records.controller';
import { DoctorPatientsController } from './doctor-patients.controller';
import { DoctorPatientsService } from './doctor-patients.service';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { PatientRecordsController } from './patient-records.controller';
import { PatientRecordsForDoctorController } from './patient-records-for-doctor.controller';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { RecordsAccessPolicy } from './records-access.policy';
import { RecordsService } from './records.service';

/**
 * Clinical notes, prescriptions and role-based medical-records access.
 * Imports `ConsultationsModule` to reuse `ConsultationsService.assertRecordWritable`
 * (the IN_PROGRESS/COMPLETED gate) instead of duplicating that state check.
 * `RecordsAccessPolicy` is the single place every record-reading endpoint
 * routes authorization through — see its own doc comment for the rules.
 */
@Module({
  imports: [ConsultationsModule],
  controllers: [
    ConsultationRecordsController,
    NotesController,
    PrescriptionsController,
    PatientRecordsController,
    PatientRecordsForDoctorController,
    DoctorPatientsController,
  ],
  providers: [RecordsAccessPolicy, NotesService, PrescriptionsService, RecordsService, DoctorPatientsService],
})
export class RecordsModule {}
