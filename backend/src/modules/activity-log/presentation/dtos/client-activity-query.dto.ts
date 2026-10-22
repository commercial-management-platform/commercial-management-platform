import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

import {
  ACTIVITY_ACTIONS,
  type ActivityAction,
} from '../../../../shared/domain/activity-log/activity-action.js';
import { DATE_ONLY_PATTERN } from '../../../../shared/domain/time/business-time.js';
import { PaginationQueryDto } from '../../../../shared/presentation/dtos/pagination-query.dto.js';

export class ClientActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ACTIVITY_ACTIONS, example: 'client.updated' })
  @IsOptional()
  @IsIn(ACTIVITY_ACTIONS, {
    message: `action must be one of: ${ACTIVITY_ACTIONS.join(', ')}`,
  })
  action?: ActivityAction;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'First day included (YYYY-MM-DD, business time America/Bogota)',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Last day included (YYYY-MM-DD, business time America/Bogota)',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
