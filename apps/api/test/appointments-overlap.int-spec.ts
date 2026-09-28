import { AppointmentStatus, PrismaClient, Role } from '@prisma/client';

/**
 * Exercises the btree_gist EXCLUDE and CHECK constraints added by the
 * `*_db_constraints` migration. These are the last line of defence against
 * double-booking, independent of any service-level checks.
 */
describe('appointments table constraints (db_test)', () => {
  const prisma = new PrismaClient();
  let doctorId: string;
  let patientAId: string;
  let patientBId: string;

  const at = (hhmm: string): Date => new Date(`2030-01-15T${hhmm}:00.000Z`);

  function book(
    patientId: string,
    from: string,
    to: string,
    status: AppointmentStatus = AppointmentStatus.SCHEDULED,
    doctor = doctorId,
  ) {
    return prisma.appointment.create({
      data: {
        patientId,
        doctorId: doctor,
        startAt: at(from),
        endAt: at(to),
        status,
        reasonForVisit: 'Fictional test visit',
      },
    });
  }

  async function createUser(email: string, role: Role): Promise<string> {
    const user = await prisma.user.create({
      data: { email, role, passwordHash: 'not-a-real-hash' },
    });
    return user.id;
  }

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.user.deleteMany();
    doctorId = await createUser('doctor@doksabahay.test', Role.DOCTOR);
    patientAId = await createUser('patient.a@doksabahay.test', Role.PATIENT);
    patientBId = await createUser('patient.b@doksabahay.test', Role.PATIENT);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects two overlapping SCHEDULED appointments for the same doctor', async () => {
    await book(patientAId, '10:00', '10:30');

    await expect(book(patientBId, '10:15', '10:45')).rejects.toThrow(
      /appointments_doctor_no_overlap/,
    );
  });

  it('accepts an overlapping CANCELLED appointment for the same doctor', async () => {
    await book(patientAId, '10:00', '10:30');

    await expect(
      book(patientBId, '10:15', '10:45', AppointmentStatus.CANCELLED),
    ).resolves.toMatchObject({ status: AppointmentStatus.CANCELLED });
  });

  it('rejects two overlapping SCHEDULED appointments for the same patient', async () => {
    const otherDoctorId = await createUser('doctor.two@doksabahay.test', Role.DOCTOR);
    await book(patientAId, '10:00', '10:30');

    await expect(book(patientAId, '10:15', '10:45', undefined, otherDoctorId)).rejects.toThrow(
      /appointments_patient_no_overlap/,
    );
  });

  it('allows back-to-back appointments (half-open ranges)', async () => {
    await book(patientAId, '10:00', '10:30');

    await expect(book(patientBId, '10:30', '11:00')).resolves.toBeDefined();
  });

  it('rejects an appointment whose end is not after its start', async () => {
    await expect(book(patientAId, '10:30', '10:30')).rejects.toThrow(
      /appointments_end_after_start_check/,
    );
  });
});
