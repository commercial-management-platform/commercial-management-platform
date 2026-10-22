import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ChangeContactStatusDto {
  @ApiProperty({
    example: false,
    description:
      'true to reactivate the contact, false to deactivate it. Deactivation is a soft delete: the contact and its commercial history are preserved',
  })
  @IsBoolean()
  active: boolean;
}
