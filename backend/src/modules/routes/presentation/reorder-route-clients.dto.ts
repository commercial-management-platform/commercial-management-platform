import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, ValidateNested } from 'class-validator';

class ReorderItemDto {
  @ApiProperty()
  @IsInt()
  clientId!: number;

  @ApiProperty()
  @IsInt()
  visitOrder!: number;
}

export class ReorderRouteClientsDto {
  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  clientIds?: number[];

  @ApiProperty({ required: false, type: [ReorderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items?: ReorderItemDto[];
}
