import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { VisitForm } from '../../domain/visit-form.js';
import { VisitStatus } from '../../domain/visit-status.js';

class VisitFormVisitDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty()
  scheduledDate: Date;

  @ApiProperty({ enum: VisitStatus })
  status: VisitStatus;

  @ApiPropertyOptional({ type: Number, nullable: true })
  visitOrder: number | null;

  @ApiPropertyOptional({ nullable: true })
  startedAt: Date | null;

  @ApiProperty()
  locationConfirmed: boolean;
}

class VisitFormClientDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 'Distribuidora Andina SAS' })
  businessName: string;

  @ApiPropertyOptional({ nullable: true })
  tradeName: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  latitude: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  longitude: number | null;
}

class VisitFormContactDto {
  @ApiProperty({ example: 'Maria Rodriguez' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  mobile: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;
}

class VisitFormNamedRefDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Norte' })
  name: string;
}

class VisitFormWeekDto {
  @ApiProperty({ example: '2026-01-15' })
  date: string;

  @ApiProperty({ example: 3, description: 'ISO-8601 week number' })
  isoWeek: number;

  @ApiProperty({ example: 'Thursday' })
  weekday: string;
}

export class VisitFormResponseDto {
  @ApiProperty({ type: VisitFormVisitDto })
  visit: VisitFormVisitDto;

  @ApiProperty({ type: VisitFormClientDto })
  client: VisitFormClientDto;

  @ApiPropertyOptional({ type: VisitFormContactDto, nullable: true })
  primaryContact: VisitFormContactDto | null;

  @ApiPropertyOptional({ type: VisitFormNamedRefDto, nullable: true })
  route: VisitFormNamedRefDto | null;

  @ApiPropertyOptional({ type: VisitFormNamedRefDto, nullable: true })
  zone: VisitFormNamedRefDto | null;

  @ApiProperty({ type: VisitFormNamedRefDto })
  advisor: VisitFormNamedRefDto;

  @ApiProperty({ type: VisitFormWeekDto })
  week: VisitFormWeekDto;

  static fromDomain(form: VisitForm): VisitFormResponseDto {
    const dto = new VisitFormResponseDto();
    dto.visit = form.visit;
    dto.client = form.client;
    dto.primaryContact = form.primaryContact;
    dto.route = form.route;
    dto.zone = form.zone;
    dto.advisor = form.advisor;
    dto.week = form.week;
    return dto;
  }
}
