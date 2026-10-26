// Token para inyectar el servicio de archivos (la interfaz no existe en
// tiempo de ejecución, por eso Nest necesita un Symbol).
export const STORAGE = Symbol('STORAGE');

/** Datos necesarios para guardar un archivo. */
export interface StorageUploadInput {
  /** Ruta del objeto en el bucket, por ejemplo quotes/5/<uuid>.pdf */
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Servicio compartido de archivos (HU-20). Las demás HU lo usan sin saber
 * que detrás hay S3: en las pruebas se reemplaza por uno falso.
 */
export interface StoragePort {
  /** Sube el archivo y devuelve su key (lo único que se guarda en la BD). */
  upload(input: StorageUploadInput): Promise<string>;
  /** URL firmada de corta duración para ver o descargar el archivo. */
  getSignedUrl(key: string): Promise<string>;
  /** Elimina el archivo (por ejemplo, cuando su registro se reemplaza). */
  delete(key: string): Promise<void>;
}
