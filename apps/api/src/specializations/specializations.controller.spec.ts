import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { configureApp } from '../app.setup';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SpecializationsModule } from './specializations.module';

describe('GET /specializations', () => {
  let app: INestApplication<App>;
  const prisma = { specialization: { findMany: jest.fn() } };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, SpecializationsModule],
    })
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

  it('returns specializations sorted by name', async () => {
    const rows = [
      {
        id: '6f1c2b0e-8d8e-4c55-9d7c-0d3a4f0b1a11',
        name: 'Cardiology',
        slug: 'cardiology',
        description: 'Heart.',
      },
    ];
    prisma.specialization.findMany.mockResolvedValueOnce(rows);

    await request(app.getHttpServer()).get('/specializations').expect(200).expect(rows);
    expect(prisma.specialization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
  });
});
