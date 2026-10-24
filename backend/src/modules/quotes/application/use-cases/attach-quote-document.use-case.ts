import { randomUUID } from 'node:crypto';

import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { StoragePort } from '../../../../shared/application/ports/storage.port.js';
import {
  validateStoredFile,
  type UploadedFileData,
} from '../../../../shared/application/validate-stored-file.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { Quote } from '../../domain/entities/quote.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { assertQuoteVisible } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

/**
 * Adjunta (o reemplaza) el documento de una cotización (HU-12 / HU-20).
 * El archivo va a S3 y la BD guarda solo la key (CA-04).
 */
export class AttachQuoteDocumentUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly storage: StoragePort,
  ) {}

  async execute(
    actor: QuoteActor,
    quoteId: number,
    file: UploadedFileData | undefined,
  ): Promise<Quote> {
    // 1. Solo quien puede ver la cotización puede adjuntarle un documento.
    const quote = await assertQuoteVisible(
      await this.quotes.findById(quoteId),
      actor,
      this.advisorAccess,
      quoteId,
    );

    // 2. Se valida tipo y tamaño antes de subir nada (CA-05).
    const valid = validateStoredFile(file);

    // 3. Se sube a S3 con una key única: quotes/{quoteId}/{uuid}.{ext}.
    const previousKey = quote.documentKey;
    const key = await this.storage.upload({
      key: `quotes/${quoteId}/${randomUUID()}.${valid.extension}`,
      body: valid.buffer,
      contentType: valid.contentType,
    });

    // 4. Se guarda la key en la BD. Si falla, se borra el archivo recién
    //    subido para no dejar objetos huérfanos en el bucket.
    let updated: Quote | null;
    try {
      updated = await this.quotes.updateDocumentKey(quoteId, key);
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
    if (!updated) {
      await this.storage.delete(key);
      throw new NotFoundError(`Quote with id '${quoteId}' not found`);
    }

    // 5. Si la cotización ya tenía documento, se elimina el anterior.
    if (previousKey) await this.storage.delete(previousKey);
    return updated;
  }
}
