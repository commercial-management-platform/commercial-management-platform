import { ApiProperty } from '@nestjs/swagger';
import type { Advisor } from '../../application/ports/advisor-directory.port.js';
import { AdvisorStatus } from '../../application/ports/advisor-profile.port.js';

export class AdvisorResponseDto {
  @ApiProperty({
    example: 3,
    description:
      'Advisor id (advisor table). Routes, visits, quotes and orders use this id',
  })
  id: number;

  @ApiProperty({ example: 'usr_abc123', description: 'Linked user id' })
  userId: string;

  @ApiProperty({ example: 'Laura Gómez', description: 'Full name' })
  name: string;

  @ApiProperty({ example: 'laura@cmp.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  phone: string | null;

  @ApiProperty({ enum: AdvisorStatus, example: AdvisorStatus.Active })
  status: AdvisorStatus;

  static fromDomain(advisor: Advisor): AdvisorResponseDto {
    return Object.assign(new AdvisorResponseDto(), advisor);
  }
}
