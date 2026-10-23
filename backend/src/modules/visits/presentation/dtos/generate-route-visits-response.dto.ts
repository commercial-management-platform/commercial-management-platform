import { ApiProperty } from '@nestjs/swagger';
import type {
  GeneratedRouteVisits,
  SkipReason,
} from '../../application/generate-route-visits.use-case.js';
import { VisitResponseDto } from './visit-response.dto.js';

export class SkippedClientDto {
  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ example: 'already_scheduled' })
  reason: SkipReason;
}

export class GenerateRouteVisitsResponseDto {
  @ApiProperty({ type: [VisitResponseDto] })
  created: VisitResponseDto[];

  @ApiProperty({ type: [SkippedClientDto] })
  skipped: SkippedClientDto[];

  static fromDomain(
    result: GeneratedRouteVisits,
  ): GenerateRouteVisitsResponseDto {
    const dto = new GenerateRouteVisitsResponseDto();
    dto.created = result.created.map((visit) =>
      VisitResponseDto.fromDomain(visit),
    );
    dto.skipped = result.skipped;
    return dto;
  }
}
