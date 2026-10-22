import { ApiProperty } from '@nestjs/swagger';
import type { RecordedVisitOutcome } from '../../application/record-visit-outcome.use-case.js';
import { VisitResponseDto } from './visit-response.dto.js';

class VisitOutcomeDto {
  @ApiProperty({ example: 1, description: 'visit_result catalog id' })
  visitResultId: number;

  @ApiProperty({ example: 'Interested in a bulk order for next month' })
  observation: string;

  @ApiProperty()
  createdAt: Date;
}

/** VisitResponseDto plus the outcome just recorded for it. */
export class VisitOutcomeResponseDto extends VisitResponseDto {
  @ApiProperty({ type: VisitOutcomeDto })
  outcome: VisitOutcomeDto;

  static fromOutcome(result: RecordedVisitOutcome): VisitOutcomeResponseDto {
    const dto = new VisitOutcomeResponseDto();
    Object.assign(dto, VisitResponseDto.fromDomain(result.visit));
    dto.outcome = {
      visitResultId: result.outcome.visitResultId,
      observation: result.outcome.observation,
      // The outcome always comes from persistence, so createdAt exists.
      createdAt: result.outcome.createdAt!,
    };
    return dto;
  }
}
