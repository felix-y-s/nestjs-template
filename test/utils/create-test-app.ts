import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from '../../src/app.module.js';
import { GlobalExceptionFilter } from '../../src/common/exception/global-exception.filter.js';

/**
 * E2E 테스트용 앱 부트스트랩.
 * main.ts와 동일한 전역 파이프라인(ValidationPipe, GlobalExceptionFilter,
 * ClassSerializerInterceptor)을 구성해 실제 운영 동작과 일치시킨다.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  await app.init();
  return app;
}
