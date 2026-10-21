import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Laura Gómez Actualizada',
    description: 'Updated full name',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-avatar.jpg',
    description: 'Updated profile image URL',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  image?: string | null;
}
