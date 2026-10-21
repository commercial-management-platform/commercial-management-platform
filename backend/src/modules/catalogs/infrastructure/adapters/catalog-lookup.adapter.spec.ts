import { describe, expect, it, vi } from 'vitest';
import type { CatalogDao } from '../persistence/daos/catalog.dao.js';
import { CatalogLookupAdapter } from './catalog-lookup.adapter.js';

function createAdapter(
  entry: { id: number; name: string; active: boolean } | null,
) {
  const dao = { findById: vi.fn().mockResolvedValue(entry) };
  return {
    adapter: new CatalogLookupAdapter(dao as unknown as CatalogDao),
    dao,
  };
}

describe('CatalogLookupAdapter', () => {
  it('returns true for an existing active entry', async () => {
    const { adapter, dao } = createAdapter({
      id: 3,
      name: 'Alto',
      active: true,
    });

    await expect(adapter.isActive('client_potential', 3)).resolves.toBe(true);
    expect(dao.findById).toHaveBeenCalledWith('clientPotential', 3);
  });

  it('returns false for an inactive entry', async () => {
    const { adapter } = createAdapter({ id: 1, name: 'Norte', active: false });

    await expect(adapter.isActive('zone', 1)).resolves.toBe(false);
  });

  it('returns false for a missing entry', async () => {
    const { adapter } = createAdapter(null);

    await expect(adapter.isActive('portfolio', 99)).resolves.toBe(false);
  });

  it('rejects invalid ids without querying', async () => {
    const { adapter, dao } = createAdapter(null);

    for (const id of [0, -1, 1.5, Number.NaN, 2_147_483_648]) {
      await expect(adapter.isActive('zone', id)).resolves.toBe(false);
    }
    expect(dao.findById).not.toHaveBeenCalled();
  });
});
