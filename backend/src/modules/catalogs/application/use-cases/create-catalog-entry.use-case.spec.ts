import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogRepository } from '../../domain/repositories/catalog.repository.js';
import { CreateCatalogEntryUseCase } from './create-catalog-entry.use-case.js';

function createRepository(): CatalogRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (_type, entry) => entry),
    update: vi.fn(),
    deactivate: vi.fn(),
    setActive: vi.fn(),
  };
}

describe('CreateCatalogEntryUseCase', () => {
  it('normalizes a name before checking and saving it', async () => {
    const repository = createRepository();
    const useCase = new CreateCatalogEntryUseCase(repository);

    await expect(useCase.execute('zone', ' Norte ')).resolves.toEqual({
      id: null,
      name: 'Norte',
      active: true,
    });
    expect(repository.findByName).toHaveBeenCalledWith('zone', 'Norte');
  });

  it('requires order when creating a client potential', async () => {
    const useCase = new CreateCatalogEntryUseCase(createRepository());

    await expect(
      useCase.execute('clientPotential', 'Alto'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate normalized name', async () => {
    const repository = createRepository();
    vi.mocked(repository.findByName).mockResolvedValue({
      id: 1,
      name: 'Norte',
      active: true,
    });
    const useCase = new CreateCatalogEntryUseCase(repository);

    await expect(useCase.execute('zone', ' Norte ')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
