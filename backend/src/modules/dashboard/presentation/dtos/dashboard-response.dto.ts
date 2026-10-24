import { ApiProperty } from '@nestjs/swagger';

import type { Paginated } from '../../../../shared/application/pagination.js';
import {
  businessDateOf,
  isoWeekNumber,
} from '../../../../shared/domain/time/business-time.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { DashboardKpis } from '../../application/use-cases/get-dashboard-kpis.use-case.js';
import {
  effectiveness,
  type CommercialKpis,
} from '../../domain/entities/commercial-kpis.js';
import type { VisitTrackingRow } from '../../domain/entities/visit-tracking-row.js';

export class CommercialKpisDto {
  @ApiProperty({ example: 18, description: 'Visits of the week, without the cancelled ones' })
  scheduledVisits: number;

  @ApiProperty({ example: 12, description: 'Visits of the week in status visited' })
  completedVisits: number;

  @ApiProperty({ example: 67, description: 'Completed ÷ scheduled visits, whole percentage' })
  effectiveness: number;

  @ApiProperty({ example: '4500000.5', description: 'Sum of the quotes of the week (decimal text)' })
  quotedValue: string;

  @ApiProperty({ example: 3, description: 'Sales orders of the week confirmed or delivered' })
  closedOrders: number;

  @ApiProperty({ example: '2100000', description: 'Sum of those sales orders (decimal text)' })
  billedValue: string;

  static fromDomain(kpis: CommercialKpis): CommercialKpisDto {
    return Object.assign(new CommercialKpisDto(), {
      ...kpis,
      effectiveness: effectiveness(kpis),
    });
  }
}

export class DashboardWeekDto {
  @ApiProperty({ example: '2026-10-19', description: 'Monday, YYYY-MM-DD' })
  from: string;

  @ApiProperty({ example: '2026-10-25', description: 'Sunday, YYYY-MM-DD' })
  to: string;

  @ApiProperty({ example: 43, description: 'ISO-8601 week number' })
  isoWeek: number;
}

export class DashboardKpisResponseDto {
  @ApiProperty({ type: DashboardWeekDto })
  week: DashboardWeekDto;

  @ApiProperty({ type: CommercialKpisDto })
  current: CommercialKpisDto;

  @ApiProperty({ type: CommercialKpisDto, description: 'The week before, for the trend' })
  previous: CommercialKpisDto;

  static fromDomain(kpis: DashboardKpis): DashboardKpisResponseDto {
    return Object.assign(new DashboardKpisResponseDto(), {
      week: kpis.week,
      current: CommercialKpisDto.fromDomain(kpis.current),
      previous: CommercialKpisDto.fromDomain(kpis.previous),
    });
  }
}

export class VisitTrackingRowDto {
  @ApiProperty() visitId: number;
  @ApiProperty({ description: 'UTC instant (ISO 8601)' }) scheduledDate: Date;
  @ApiProperty({ example: '2026-10-22', description: 'Day of the visit in business time' })
  date: string;
  @ApiProperty({ example: 43 }) isoWeek: number;
  @ApiProperty() advisorId: number;
  @ApiProperty() advisorName: string;
  @ApiProperty({ type: String, nullable: true }) zone: string | null;
  @ApiProperty({ type: Number, nullable: true }) routeId: number | null;
  @ApiProperty({ type: String, nullable: true }) routeName: string | null;
  @ApiProperty() clientId: number;
  @ApiProperty() clientName: string;
  @ApiProperty({ type: String, nullable: true }) municipality: string | null;
  @ApiProperty({ type: String, nullable: true }) clientType: string | null;
  @ApiProperty({ type: String, nullable: true }) clientPotential: string | null;
  @ApiProperty({ enum: VisitStatus }) status: VisitStatus;
  @ApiProperty({ type: String, nullable: true }) result: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'COT-0001' }) quoteNumbers: string | null;
  @ApiProperty({ type: String, nullable: true, example: '1250000' }) quoteValue: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'PED-0001' }) orderNumbers: string | null;
  @ApiProperty({ type: String, nullable: true, example: '2026-10-28' }) nextFollowUp: string | null;

  static fromDomain(row: VisitTrackingRow): VisitTrackingRowDto {
    const date = businessDateOf(row.scheduledDate);
    return Object.assign(new VisitTrackingRowDto(), {
      ...row,
      date,
      isoWeek: isoWeekNumber(date),
    });
  }
}

export class PaginatedVisitTrackingResponseDto {
  @ApiProperty({ type: [VisitTrackingRowDto] }) data: VisitTrackingRowDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  static fromDomain(page: Paginated<VisitTrackingRow>): PaginatedVisitTrackingResponseDto {
    return Object.assign(new PaginatedVisitTrackingResponseDto(), {
      ...page,
      data: page.data.map((row) => VisitTrackingRowDto.fromDomain(row)),
    });
  }
}
