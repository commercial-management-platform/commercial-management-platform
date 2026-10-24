import { vi } from 'vitest';

import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { Quote } from '../../domain/entities/quote.js';
import { AttachQuoteDocumentUseCase } from './attach-quote-document.use-case.js';

const admin = { id: 'usr_admin', role: UserRole.Admin };
const pdf = {
  buffer: Buffer.from('%PDF'),
  size: 4,
  mimetype: 'application/pdf',
};

function aQuote(documentKey: string | null = null): Quote {
  return new Quote({
    id: 7,
    number: 'COT-0007',
    clientId: 1,
    advisorId: 1,
    visitId: null,
    date: '2026-10-22',
    value: '0.00',
    currency: 'COP',
    status: 'draft',
    documentKey,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function setup(existing: Quote | null = aQuote()) {
  const quotes = {
    findById: vi.fn().mockResolvedValue(existing),
    updateDocumentKey: vi.fn(async (_id: number, key: string) =>
      aQuote(key),
    ),
  };
  const advisorAccess = { canAccess: vi.fn().mockResolvedValue(true) };
  const storage = {
    upload: vi.fn(async ({ key }: { key: string }) => key),
    getSignedUrl: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const useCase = new AttachQuoteDocumentUseCase(
    quotes as never,
    advisorAccess as never,
    storage,
  );
  return { useCase, quotes, storage };
}

describe('AttachQuoteDocumentUseCase', () => {
  it('uploads the file with a quotes/{id}/{uuid}.pdf key and saves only the key', async () => {
    const { useCase, quotes, storage } = setup();

    const result = await useCase.execute(admin, 7, pdf);

    const uploaded = storage.upload.mock.calls[0][0];
    expect(uploaded.key).toMatch(/^quotes\/7\/[0-9a-f-]{36}\.pdf$/);
    expect(quotes.updateDocumentKey).toHaveBeenCalledWith(7, uploaded.key);
    expect(result.documentKey).toBe(uploaded.key);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('does not upload anything when the file is invalid', async () => {
    const { useCase, storage } = setup();

    await expect(
      useCase.execute(admin, 7, { ...pdf, mimetype: 'text/plain' }),
    ).rejects.toThrow(/PDF, JPG and PNG/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('answers not found when the quote does not exist', async () => {
    const { useCase, storage } = setup(null);

    await expect(useCase.execute(admin, 7, pdf)).rejects.toThrow(/not found/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('deletes the previous file after replacing the document', async () => {
    const { useCase, storage } = setup(aQuote('quotes/7/old.pdf'));

    await useCase.execute(admin, 7, pdf);

    expect(storage.delete).toHaveBeenCalledExactlyOnceWith('quotes/7/old.pdf');
  });

  it('removes the new file when saving the key fails, keeping the old one', async () => {
    const { useCase, quotes, storage } = setup(aQuote('quotes/7/old.pdf'));
    quotes.updateDocumentKey.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute(admin, 7, pdf)).rejects.toThrow('db down');

    const newKey = storage.upload.mock.calls[0][0].key;
    expect(storage.delete).toHaveBeenCalledExactlyOnceWith(newKey);
  });
});
