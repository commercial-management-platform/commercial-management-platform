import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetUserStatusDto {
  @ApiProperty({
    example: false,
    description: 'Set user active (true) or deactivated (false)',
  })
  @IsBoolean()
  isActive: boolean;
}
