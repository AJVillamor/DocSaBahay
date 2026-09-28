import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { ACCESS_COOKIE, REFRESH_COOKIE } from './auth/auth.types';

/** Builds the OpenAPI document from the controllers' Swagger decorators. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('DokSaBahay API')
    .setDescription('Fictional prototype — not for real medical use.')
    .setVersion('0.1.0')
    .addCookieAuth(
      ACCESS_COOKIE,
      { type: 'apiKey', in: 'cookie', name: ACCESS_COOKIE },
      ACCESS_COOKIE,
    )
    .addCookieAuth(
      REFRESH_COOKIE,
      { type: 'apiKey', in: 'cookie', name: REFRESH_COOKIE },
      REFRESH_COOKIE,
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}

/**
 * Serves Swagger UI at `/docs` and the spec at `/docs-json`. The UI assets come
 * from the bundled swagger-ui-dist package; nothing is loaded from a CDN.
 */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app));
}
