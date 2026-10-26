import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from './user-profile.dto.js';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Session bearer token',
  })
  token: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}
