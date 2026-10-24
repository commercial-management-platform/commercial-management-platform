import { ValidationError } from '../domain/errors/index.js';
import {
  STORAGE_MAX_FILE_BYTES,
  validateStoredFile,
} from './validate-stored-file.js';

const file = (mimetype: string, size = 10) => ({
  buffer: Buffer.alloc(size),
  size,
  mimetype,
});

describe('validateStoredFile (CA-05)', () => {
  it.each([
    ['application/pdf', 'pdf'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
  ])('accepts %s and returns the extension %s', (mimetype, extension) => {
    expect(validateStoredFile(file(mimetype))).toMatchObject({
      extension,
      contentType: mimetype,
    });
  });

  it('rejects a missing file', () => {
    expect(() => validateStoredFile(undefined)).toThrow(ValidationError);
  });

  it.each(['text/plain', 'image/gif', 'application/zip', ''])(
    'rejects the type "%s"',
    (mimetype) => {
      expect(() => validateStoredFile(file(mimetype))).toThrow(
        /PDF, JPG and PNG/,
      );
    },
  );

  it('accepts a file of exactly the maximum size and rejects one byte more', () => {
    expect(() =>
      validateStoredFile(file('application/pdf', STORAGE_MAX_FILE_BYTES)),
    ).not.toThrow();
    expect(() =>
      validateStoredFile(file('application/pdf', STORAGE_MAX_FILE_BYTES + 1)),
    ).toThrow(/maximum size/);
  });
});
