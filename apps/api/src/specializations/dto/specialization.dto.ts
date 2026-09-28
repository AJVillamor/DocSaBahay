import { ApiProperty } from '@nestjs/swagger';
import { Specialization } from '@doksabahay/shared';

/** Mirrors `Specialization` in @doksabahay/shared. */
export class SpecializationDto implements Specialization {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Dermatology' })
  name: string;

  @ApiProperty({ example: 'dermatology' })
  slug: string;

  @ApiProperty({ example: 'Conditions of the skin, hair and nails.' })
  description: string;
}
