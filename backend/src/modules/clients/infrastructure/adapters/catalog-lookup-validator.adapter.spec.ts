import { describe, expect, it, vi } from 'vitest';
import type { CatalogLookupPort } from '../../../catalogs/application/ports/catalog-lookup.port.js';
import { CatalogLookupValidatorAdapter } from './catalog-lookup-validator.adapter.js';

describe('CatalogLookupValidatorAdapter', () => {
  it.each([true, false])(
    'returns the catalog lookup answer (%s)',
    async (active) => {
      const lookup: CatalogLookupPort = {
        isActive: vi.fn().mockResolvedValue(active),
      };
      const adapter = new CatalogLookupValidatorAdapter(lookup);

      await expect(adapter.exists('client_type', 2)).resolves.toBe(active);
      expect(lookup.isActive).toHaveBeenCalledWith('client_type', 2);
    },
  );
});
