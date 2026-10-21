import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderItemDto {
  @ApiProperty()
  @IsInt()
  clientId!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  visitOrder!: number;
}

/**
 * Send either `clientIds` (visit order follows the array position) or
 * `items` (explicit visitOrder). Both must list every client of the route.
 */
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
