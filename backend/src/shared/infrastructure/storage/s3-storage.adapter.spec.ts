import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { vi } from 'vitest';

import { S3StorageAdapter } from './s3-storage.adapter.js';

// No se llama a AWS: la firma de URLs se reemplaza por una función falsa.
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed.test/url'),
}));

function setup() {
  const send = vi.fn().mockResolvedValue({});
  const client = { send } as unknown as S3Client;
  return { send, adapter: new S3StorageAdapter(client, 'mi-bucket', 300) };
}

describe('S3StorageAdapter', () => {
  it('uploads the object to the bucket and returns its key', async () => {
    const { send, adapter } = setup();

    const key = await adapter.upload({
      key: 'quotes/1/a.pdf',
      body: Buffer.from('x'),
      contentType: 'application/pdf',
    });

    expect(key).toBe('quotes/1/a.pdf');
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'mi-bucket',
      Key: 'quotes/1/a.pdf',
      ContentType: 'application/pdf',
    });
  });

  it('signs a GET URL that expires in the configured seconds', async () => {
    const { adapter } = setup();

    await expect(adapter.getSignedUrl('quotes/1/a.pdf')).resolves.toBe(
      'https://signed.test/url',
    );

    const [, command, options] = vi.mocked(getSignedUrl).mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as GetObjectCommand).input).toMatchObject({
      Bucket: 'mi-bucket',
      Key: 'quotes/1/a.pdf',
    });
    expect(options).toEqual({ expiresIn: 300 });
  });

  it('deletes the object', async () => {
    const { send, adapter } = setup();

    await adapter.delete('quotes/1/a.pdf');

    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'mi-bucket',
      Key: 'quotes/1/a.pdf',
    });
  });
});
