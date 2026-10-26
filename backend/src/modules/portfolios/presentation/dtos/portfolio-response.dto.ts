import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { CatalogEntry } from '../../../catalogs/domain/repositories/catalog.repository.js';

export class PortfolioResponseDto {
  @ApiProperty({ example: 1, description: 'Portfolio identifier' })
  id: number;

  @ApiProperty({
    example: 'Portafolio Andino',
    description: 'Name of the portfolio',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Clientes del sector andino',
    description: 'Description of the portfolio',
  })
  description: string | null;

  @ApiProperty({
    example: true,
    description:
      'Active state. false means deactivated: no new clients can be associated',
  })
  active: boolean;

  static fromDomain(portfolio: CatalogEntry): PortfolioResponseDto {
    const dto = new PortfolioResponseDto();
    // The portfolio always comes from persistence, so the id exists.
    dto.id = portfolio.id!;
    dto.name = portfolio.name;
    dto.description = portfolio.description ?? null;
    dto.active = portfolio.active;

    return dto;
  }
}
