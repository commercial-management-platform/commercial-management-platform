import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { VisitAgendaEntry } from '../../domain/visit-agenda-entry.js';
import { VisitStatus } from '../../domain/visit-status.js';

class AgendaClientDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 'Distribuidora Andina SAS' })
  businessName: string;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;
}

class AgendaContactDto {
  @ApiProperty({ example: 'Maria Rodriguez' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  mobile: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;
}

class AgendaPotentialDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Alto' })
  name: string;
}

export class VisitAgendaEntryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  routeId: number | null;

  @ApiProperty({ description: 'Scheduled date and time (UTC)' })
  scheduledDate: Date;

  @ApiPropertyOptional({ type: Number, nullable: true })
  visitOrder: number | null;

  @ApiPropertyOptional({ nullable: true })
  actualDate: Date | null;

  @ApiProperty({ enum: VisitStatus })
  status: VisitStatus;

  @ApiProperty({ type: AgendaClientDto })
  client: AgendaClientDto;

  @ApiPropertyOptional({ type: AgendaContactDto, nullable: true })
  primaryContact: AgendaContactDto | null;

  @ApiPropertyOptional({ type: AgendaPotentialDto, nullable: true })
  potential: AgendaPotentialDto | null;

  static fromDomain(entry: VisitAgendaEntry): VisitAgendaEntryResponseDto {
    const dto = new VisitAgendaEntryResponseDto();
    dto.id = entry.id;
    dto.routeId = entry.routeId;
    dto.scheduledDate = entry.scheduledDate;
    dto.visitOrder = entry.visitOrder;
    dto.actualDate = entry.actualDate;
    dto.status = entry.status;
    dto.client = entry.client;
    dto.primaryContact = entry.primaryContact;
    dto.potential = entry.potential;
    return dto;
  }
}
