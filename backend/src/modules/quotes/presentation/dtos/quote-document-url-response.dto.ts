import { ApiProperty } from '@nestjs/swagger';

export class QuoteDocumentUrlResponseDto {
  @ApiProperty({
    example: 'https://bucket.s3.us-east-1.amazonaws.com/quotes/5/abc.pdf?X-Amz-Signature=...',
    description: 'Signed URL; it expires after S3_SIGNED_URL_EXPIRES_SECONDS',
  })
  url: string;

  static fromUrl(url: string): QuoteDocumentUrlResponseDto {
    const dto = new QuoteDocumentUrlResponseDto();
    dto.url = url;
    return dto;
  }
}
