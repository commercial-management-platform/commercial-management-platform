import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateSalesOrderDto {
  @ApiProperty({ example: 10, description: 'Existing active client id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId: number;
  @ApiPropertyOptional({
    example: 2,
    description:
      'Required for admin/director; advisors are resolved from the session',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;
  @ApiPropertyOptional({
    example: 45,
    nullable: true,
    description: 'Optional visit; it must match the client and advisor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  visitId?: number;
  @ApiProperty({
    example: '2026-10-23',
    description: 'Order date (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
  @ApiProperty({
    example: '125000.500000',
    description:
      'Non-negative decimal string, up to 12 integer and 6 decimal places',
  })
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/, {
    message:
      'value must be a non-negative decimal with at most 12 integer digits and 6 decimal places',
  })
  value: string;
  @ApiProperty({
    example: '2026-10-30',
    description: 'Estimated delivery date (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'estimatedDeliveryDate must be YYYY-MM-DD',
  })
  estimatedDeliveryDate: string;
}
