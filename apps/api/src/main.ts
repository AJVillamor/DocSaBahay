import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { configureApp } from './app.setup';
import { AppModule } from './app.module';
import { Env } from './config/env';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  configureApp(app, { webOrigin: config.get('WEB_ORIGIN', { infer: true }) });
  // Explicit, rather than relying on Nest's implicit default: registers the
  // socket.io adapter `NotificationsGateway` needs.
  app.useWebSocketAdapter(new IoAdapter(app));
  setupSwagger(app);
  app.enableShutdownHooks();

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
