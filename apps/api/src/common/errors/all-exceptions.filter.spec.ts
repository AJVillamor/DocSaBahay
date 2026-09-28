import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@doksabahay/shared';
import { IsEmail } from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types';

import { configureApp } from '../../app.setup';

class EchoDto {
  @IsEmail()
  email: string;
}

@Controller('test')
class TestController {
  @Post('echo')
  echo(@Body() body: EchoDto): EchoDto {
    return body;
  }

  @Get('boom')
  boom(): never {
    throw new Error('secret internal detail');
  }
}

describe('error contract', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [TestController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: 'http://localhost:3000' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns NOT_FOUND for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/nope').expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: expect.any(String) as string,
      code: ErrorCode.NOT_FOUND,
    });
  });

  it('rejects invalid payloads with VALIDATION_FAILED', async () => {
    const response = await request(app.getHttpServer())
      .post('/test/echo')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'email must be an email',
      code: ErrorCode.VALIDATION_FAILED,
    });
  });

  it('rejects unknown fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/test/echo')
      .send({ email: 'patient@example.test', role: 'ADMIN' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'property role should not exist',
    });
  });

  it('hides internal error details', async () => {
    const response = await request(app.getHttpServer()).get('/test/boom').expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR,
    });
  });
});
