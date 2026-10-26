import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ChangeClientStatusDto {
  @ApiProperty({
    example: false,
    description:
      'true to reactivate the client, false to deactivate it. Deactivation is a soft delete: the client and its commercial history are preserved',
  })
  @IsBoolean()
  active: boolean;
}
