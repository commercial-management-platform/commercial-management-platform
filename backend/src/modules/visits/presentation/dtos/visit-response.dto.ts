import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Visit } from '../../domain/visit.js';
import { InterestLevel, InterestReason } from '../../domain/visit-interest.js';
import { VisitStatus } from '../../domain/visit-status.js';

export class VisitResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ example: 2 })
  advisorId: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  routeId: number | null;

  @ApiProperty({ description: 'Scheduled date and time (UTC)' })
  scheduledDate: Date;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: "Position of the client in the route's visit order",
  })
  visitOrder: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Filled when the outcome is recorded (HU-09)',
  })
  actualDate: Date | null;

  @ApiProperty({ enum: VisitStatus })
  status: VisitStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Set the first time POST /visits/:id/start is called (HU-09)',
  })
  startedAt: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Set when the outcome is recorded (HU-09)',
  })
  finishedAt: Date | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  checkInLatitude: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  checkInLongitude: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: "Distance to the client's coordinates at check-in, in meters",
  })
  checkInDistanceMeters: number | null;

  @ApiProperty({
    description:
      'Computed by the backend only, from the check-in distance and the configured radius',
  })
  locationConfirmed: boolean;

  @ApiPropertyOptional({ type: Number, nullable: true })
  visitObjectiveId: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  visitTypeId: number | null;

  @ApiPropertyOptional({ enum: InterestLevel, nullable: true })
  interestLevel: InterestLevel | null;

  @ApiPropertyOptional({ enum: InterestReason, nullable: true })
  interestReason: InterestReason | null;

  @ApiPropertyOptional({ nullable: true })
  competitorMentioned: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromDomain(visit: Visit): VisitResponseDto {
    const dto = new VisitResponseDto();
    // The visit always comes from persistence, so the id exists.
    dto.id = visit.id!;
    dto.clientId = visit.clientId;
    dto.advisorId = visit.advisorId;
    dto.routeId = visit.routeId;
    dto.scheduledDate = visit.scheduledDate;
    dto.visitOrder = visit.visitOrder;
    dto.actualDate = visit.actualDate;
    dto.status = visit.status;
    dto.startedAt = visit.startedAt;
    dto.finishedAt = visit.finishedAt;
    dto.checkInLatitude = visit.checkInLatitude;
    dto.checkInLongitude = visit.checkInLongitude;
    dto.checkInDistanceMeters = visit.checkInDistanceMeters;
    dto.locationConfirmed = visit.locationConfirmed;
    dto.visitObjectiveId = visit.visitObjectiveId;
    dto.visitTypeId = visit.visitTypeId;
    dto.interestLevel = visit.interestLevel;
    dto.interestReason = visit.interestReason;
    dto.competitorMentioned = visit.competitorMentioned;
    dto.createdAt = visit.createdAt!;
    dto.updatedAt = visit.updatedAt!;
    return dto;
  }
}
