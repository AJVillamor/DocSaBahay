import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { DoctorListItemDto } from '../../doctors/dto/doctor-discovery.dto';

/** One symptom. */
export class SymptomDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  isRedFlag: boolean;
}

/** One category and its symptoms, as returned by `GET /matching/symptoms`. */
export class SymptomsByCategoryDto {
  @ApiProperty()
  category: string;

  @ApiProperty({ type: [SymptomDto] })
  symptoms: SymptomDto[];
}

/** Body of `POST /matching/suggest`. */
export class SuggestMatchDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  symptomIds: string[];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/** One symptom name or matched phrase that contributed to a specialization's score. */
export class MatchExplanationEntryDto {
  @ApiProperty({ enum: ['symptom', 'phrase'] })
  type: 'symptom' | 'phrase';

  @ApiProperty()
  label: string;

  @ApiProperty()
  weight: number;
}

/** One ranked specialization suggestion, with why it was suggested and doctors to book. */
export class SpecializationMatchDto {
  @ApiProperty({ format: 'uuid' })
  specializationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  score: number;

  @ApiProperty({ type: [MatchExplanationEntryDto] })
  explanation: MatchExplanationEntryDto[];

  @ApiProperty({ type: [DoctorListItemDto] })
  doctors: DoctorListItemDto[];
}

/** Response body of `POST /matching/suggest`. */
export class SuggestMatchResponseDto {
  @ApiProperty({ description: 'True if any selected symptom or matched phrase is a red flag.' })
  urgent: boolean;

  @ApiProperty({ type: [SpecializationMatchDto] })
  results: SpecializationMatchDto[];
}
