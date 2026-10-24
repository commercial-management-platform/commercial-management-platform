import { ValidationError } from '../domain/errors/index.js';

/** Tamaño máximo de un archivo guardado en S3 (CA-05). */
export const STORAGE_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Tipos permitidos (CA-05) y la extensión que se usa en la key del objeto. */
const ALLOWED_FILE_TYPES: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** Archivo recibido de una petición multipart (forma mínima que usamos). */
export interface UploadedFileData {
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

/** Archivo ya validado, listo para subir. */
export interface ValidatedFile {
  buffer: Buffer;
  contentType: string;
  /** Extensión que debe llevar la key del objeto (pdf, jpg o png). */
  extension: string;
}

/** Valida tipo y tamaño ANTES de subir (CA-05). */
export function validateStoredFile(
  file: UploadedFileData | undefined,
): ValidatedFile {
  if (!file) {
    throw new ValidationError("A file is required in the 'file' field");
  }
  const contentType = file.mimetype ?? '';
  const extension = ALLOWED_FILE_TYPES[contentType];
  if (!extension) {
    throw new ValidationError('Only PDF, JPG and PNG files are allowed');
  }
  if (file.size > STORAGE_MAX_FILE_BYTES) {
    throw new ValidationError(
      `The file exceeds the maximum size of ${STORAGE_MAX_FILE_BYTES / (1024 * 1024)} MB`,
    );
  }
  return { buffer: file.buffer, contentType, extension };
}
