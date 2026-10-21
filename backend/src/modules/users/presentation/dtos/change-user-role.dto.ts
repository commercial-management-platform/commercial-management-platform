import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeUserRoleDto {
  @ApiProperty({
    example: 'GERENTE',
    description:
      'New assigned role: ADMINISTRADOR, GERENTE, ASESOR (or admin, director, advisor)',
  })
  @IsString()
  @IsNotEmpty()
  role: string;
}
