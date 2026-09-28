import { Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { DoctorPatientDto, DoctorPatientListDto } from './dto/doctor-patients.dto';

/** Reads the caller's own patient list — no `RecordsAccessPolicy` gate needed, there is no other doctor to protect against. */
@Injectable()
export class DoctorPatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every distinct patient the doctor has ≥1 SCHEDULED or COMPLETED
   * appointment with, newest-appointment first, optionally filtered by a
   * case-insensitive first/last name match. Matches `RecordsAccessPolicy
   * .doctorTreatsPatient`'s definition of "treats" exactly — a patient never
   * appears here only to 404 when clicked, e.g. one whose sole appointment
   * with this doctor was CANCELLED before it ever happened.
   */
  async list(doctorId: string, search?: string): Promise<DoctorPatientListDto> {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED] },
      ...(search
        ? {
            patient: {
              patientProfile: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    };

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        startAt: true,
        patient: {
          select: { id: true, patientProfile: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    // `appointments` is already newest-first, so the first row seen per patient is their latest.
    const byPatient = new Map<string, DoctorPatientDto>();
    for (const appointment of appointments) {
      if (byPatient.has(appointment.patient.id)) {
        continue;
      }
      byPatient.set(appointment.patient.id, {
        id: appointment.patient.id,
        firstName: appointment.patient.patientProfile?.firstName ?? '',
        lastName: appointment.patient.patientProfile?.lastName ?? '',
        lastAppointmentAt: appointment.startAt.toISOString(),
      });
    }
    return { items: [...byPatient.values()] };
  }
}
