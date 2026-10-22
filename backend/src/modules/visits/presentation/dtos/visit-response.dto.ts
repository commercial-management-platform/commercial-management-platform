import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Visit } from '../../domain/visit.js';
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
    description: 'Filled when the visit is recorded (HU-09)',
  })
  actualDate: Date | null;

  @ApiProperty({ enum: VisitStatus })
  status: VisitStatus;

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
    dto.createdAt = visit.createdAt!;
    dto.updatedAt = visit.updatedAt!;
    return dto;
  }
}
