import { ApiProperty } from '@nestjs/swagger';

import type { Paginated } from '../../../../shared/application/pagination.js';
import {
  ACTIVITY_ACTIONS,
  type ActivityAction,
} from '../../../../shared/domain/activity-log/activity-action.js';
import type { ActivityLogRecord } from '../../domain/entities/activity-log-record.js';

export class ActivityLogUserDto {
  @ApiProperty({ example: 'H6SapoBk2lh6zKbS32GsqPausSXX1PM7' })
  id: string;

  @ApiProperty({ type: String, nullable: true, example: 'Asesor Comercial' })
  name: string | null;
}

export class ActivityLogEntryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ enum: ACTIVITY_ACTIONS, example: 'client.updated' })
  action: ActivityAction;

  @ApiProperty({ example: "Client 'Ferretería El Tornillo' updated" })
  description: string;

  @ApiProperty({ description: 'When the action happened (UTC)' })
  createdAt: Date;

  @ApiProperty({
    type: ActivityLogUserDto,
    description: 'User of the session that performed the action',
  })
  user: ActivityLogUserDto;

  static fromDomain(record: ActivityLogRecord): ActivityLogEntryResponseDto {
    const dto = new ActivityLogEntryResponseDto();
    dto.id = record.id;
    dto.clientId = record.clientId;
    dto.action = record.action;
    dto.description = record.description;
    dto.createdAt = record.createdAt;
    dto.user = { id: record.userId, name: record.userName };
    return dto;
  }
}

export class PaginatedActivityLogResponseDto {
  @ApiProperty({ type: [ActivityLogEntryResponseDto] })
  data: ActivityLogEntryResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  static fromDomain(
    page: Paginated<ActivityLogRecord>,
  ): PaginatedActivityLogResponseDto {
    const dto = new PaginatedActivityLogResponseDto();
    dto.data = page.data.map((record) =>
      ActivityLogEntryResponseDto.fromDomain(record),
    );
    dto.total = page.total;
    dto.page = page.page;
    dto.limit = page.limit;
    return dto;
  }
}
