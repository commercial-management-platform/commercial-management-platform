import { ApiProperty } from '@nestjs/swagger';
import type { Paginated } from '../../../../shared/application/pagination.js';
import type { Visit } from '../../domain/visit.js';
import { VisitResponseDto } from './visit-response.dto.js';

export class PaginatedVisitsResponseDto {
  @ApiProperty({ type: [VisitResponseDto] })
  data: VisitResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  static fromDomain(page: Paginated<Visit>): PaginatedVisitsResponseDto {
    const dto = new PaginatedVisitsResponseDto();
    dto.data = page.data.map((visit) => VisitResponseDto.fromDomain(visit));
    dto.total = page.total;
    dto.page = page.page;
    dto.limit = page.limit;
    return dto;
  }
}
