import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowUp } from '../../domain/entities/follow-up.js';

export class FollowUpResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() visitId: number;
  @ApiProperty() nextDate: string;
  @ApiPropertyOptional({ nullable: true }) nextTime: string | null;
  @ApiProperty() activity: string;
  @ApiPropertyOptional({ nullable: true }) observation: string | null;
  @ApiProperty() responsibleAdvisorId: number;
  @ApiProperty() completed: boolean;
  @ApiPropertyOptional({ nullable: true }) completedAt: Date | null;
  @ApiPropertyOptional() createdAt: Date | null;
  @ApiPropertyOptional() updatedAt: Date | null;
  @ApiPropertyOptional() status?: 'pending' | 'overdue' | 'completed';

  static fromDomain(fu: FollowUp): FollowUpResponseDto {
    const dto = new FollowUpResponseDto();
    dto.id = fu.id!;
    dto.visitId = fu.visitId;
    dto.nextDate = fu.nextDate;
    dto.nextTime = fu.nextTime;
    dto.activity = fu.activity;
    dto.observation = fu.observation;
    dto.responsibleAdvisorId = fu.responsibleAdvisorId;
    dto.completed = fu.completed;
    dto.completedAt = fu.completedAt;
    dto.createdAt = fu.createdAt;
    dto.updatedAt = fu.updatedAt;
    const today = new Date().toISOString().slice(0, 10);
    if (fu.completed) dto.status = 'completed';
    else if (fu.nextDate < today) dto.status = 'overdue';
    else dto.status = 'pending';
    return dto;
  }
}
