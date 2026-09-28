-- Hand-written: constraints Prisma's schema language cannot express.
-- Do not remove when regenerating migrations.

-- btree_gist lets a GiST index combine scalar equality (uuid =) with range overlap (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Appointments ---------------------------------------------------------------

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_end_after_start_check" CHECK ("end_at" > "start_at");

-- No two SCHEDULED appointments may overlap for the same doctor.
-- '[)' makes back-to-back slots (10:00-10:30, 10:30-11:00) legal.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_doctor_no_overlap"
  EXCLUDE USING gist (
    "doctor_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'SCHEDULED');

-- No two SCHEDULED appointments may overlap for the same patient.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_patient_no_overlap"
  EXCLUDE USING gist (
    "patient_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'SCHEDULED');

-- Field-format guards ----------------------------------------------------------

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));

ALTER TABLE "matching_keywords"
  ADD CONSTRAINT "matching_keywords_phrase_lowercase_check" CHECK ("phrase" = lower("phrase"));

ALTER TABLE "availability_rules"
  ADD CONSTRAINT "availability_rules_day_of_week_check" CHECK ("day_of_week" BETWEEN 0 AND 6),
  ADD CONSTRAINT "availability_rules_start_time_format_check" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "availability_rules_end_time_format_check" CHECK ("end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "availability_exceptions"
  ADD CONSTRAINT "availability_exceptions_end_after_start_check" CHECK ("end_at" > "start_at");
