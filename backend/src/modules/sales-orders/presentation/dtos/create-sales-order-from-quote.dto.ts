import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class CreateSalesOrderFromQuoteDto {
  @ApiProperty({
    example: '2026-10-23',
    description: 'Order date (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
  @ApiProperty({
    example: '2026-10-30',
    description: 'Estimated delivery date (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'estimatedDeliveryDate must be YYYY-MM-DD',
  })
  estimatedDeliveryDate: string;
  @ApiPropertyOptional({
    example: 45,
    nullable: true,
    description: 'Optional visit; it must match the quote client and advisor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  visitId?: number;
}
