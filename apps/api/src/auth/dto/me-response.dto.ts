import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, Role, VerificationStatus } from '@prisma/client';

export class ProfileSummaryDto {
  @ApiProperty({ example: 'Maria' })
  firstName: string;

  @ApiProperty({ example: 'Santos' })
  lastName: string;
}

/** Mirrors `MeResponse` in @doksabahay/shared. */
export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'juan.delacruz@example.com' })
  email: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;

  @ApiProperty({ enum: AccountStatus, enumName: 'AccountStatus' })
  status: AccountStatus;

  @ApiProperty({ type: ProfileSummaryDto, nullable: true })
  profile: ProfileSummaryDto | null;

  @ApiPropertyOptional({
    enum: VerificationStatus,
    enumName: 'VerificationStatus',
    description: 'Doctors only.',
  })
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Doctors only: the admin's note from the last review.",
  })
  reviewNote?: string | null;

  @ApiPropertyOptional({ description: 'Patients only.' })
  profileCompleted?: boolean;
}
