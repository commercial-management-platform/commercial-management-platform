export const CLIENT_IMPORT_READER = Symbol('CLIENT_IMPORT_READER');

/** Reads the rows of an uploaded CSV as { header: value }, header line excluded. */
export interface ClientImportReaderPort {
  parse(buffer: Buffer): Record<string, string>[];
}
