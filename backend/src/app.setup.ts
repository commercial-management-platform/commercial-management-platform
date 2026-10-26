import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  parseCorsOrigins,
  type EnvironmentVariables,
} from './config/env.validation.js';
import { DomainExceptionFilter } from './shared/infrastructure/filters/domain-exception.filter.js';

/**
 * Global HTTP configuration. Shared by main.ts and the e2e tests so both
 * exercise the same prefix, pipes, filters and CORS.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors({
    origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
    credentials: true,
  });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Commercial Management Platform API')
      .setDescription('Commercial Management Platform backend API documentation')
      .setVersion('0.0.1')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Session bearer token obtained from /api/auth/login',
        },
        'bearer',
      )
      .addCookieAuth('better-auth.session_token')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
