import { ApiProperty } from '@nestjs/swagger';
import type { Paginated } from '../../../../shared/application/pagination.js';
import { FollowUpResponseDto } from './follow-up-response.dto.js';
import type { FollowUp } from '../../domain/entities/follow-up.js';

export class PaginatedFollowUpsResponseDto {
  @ApiProperty({ type: [FollowUpResponseDto] }) data: FollowUpResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  static fromDomain(page: Paginated<FollowUp>): PaginatedFollowUpsResponseDto {
    const dto = new PaginatedFollowUpsResponseDto();
    dto.data = page.data.map((f) => FollowUpResponseDto.fromDomain(f));
    dto.total = page.total;
    dto.page = page.page;
    dto.limit = page.limit;
    return dto;
  }
}
