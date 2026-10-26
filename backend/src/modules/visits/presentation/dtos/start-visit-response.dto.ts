import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Visit } from '../../domain/visit.js';
import { VisitResponseDto } from './visit-response.dto.js';

/** VisitResponseDto plus what the check-in computed, spelled out for the UI. */
export class StartVisitResponseDto extends VisitResponseDto {
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: "Distance to the client's coordinates, in meters",
  })
  distance: number | null;

  @ApiProperty({ description: 'VISIT_CHECKIN_RADIUS_METERS used for this check-in' })
  checkInRadiusMeters: number;

  static fromStart(visit: Visit, checkInRadiusMeters: number): StartVisitResponseDto {
    const dto = new StartVisitResponseDto();
    Object.assign(dto, VisitResponseDto.fromDomain(visit));
    dto.distance = visit.checkInDistanceMeters;
    dto.checkInRadiusMeters = checkInRadiusMeters;
    return dto;
  }
}
