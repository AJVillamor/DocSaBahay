import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DbStatus } from '@doksabahay/shared';
import request from 'supertest';
import type { App } from 'supertest/types';

import { configureApp } from '../app.setup';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { HealthModule } from './health.module';

describe('GET /health', () => {
  let app: INestApplication<App>;
  const prisma = { $queryRaw: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule, HealthModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, { webOrigin: 'http://localhost:3000' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports db up when the database answers', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', db: DbStatus.UP });
  });

  it('reports db down when the database query fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("Can't reach database server"));

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', db: DbStatus.DOWN });
  });

  it('allows credentialed CORS only for the web origin', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
