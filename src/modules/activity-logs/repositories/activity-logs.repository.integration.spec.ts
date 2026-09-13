import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../../../config/configuration.js';
import { MongodbModule } from '../../../database/mongodb/mongodb.module.js';
import { ActivityLogsRepository } from './activity-logs.repository.js';

describe('ActivityLogsRepository 통합 테스트', () => {
  let repository: ActivityLogsRepository;
  let connection: Connection;
  let testUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongodbModule,
      ],
      providers: [ActivityLogsRepository],
    }).compile();

    repository = module.get<ActivityLogsRepository>(ActivityLogsRepository);
    connection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
  });

  afterEach(async () => {
    if (testUserId) {
      await connection.collection('activitylogs').deleteMany({
        userId: testUserId,
      });
    }
  });

  describe('create', () => {
    it('DB에 저장하고 생성된 문서를 반환한다', async () => {
      testUserId = randomUUID();

      const log = await repository.create({
        userId: testUserId,
        action: 'post.created',
        metadata: { postId: 'post-1' },
      });

      expect(log._id).toBeDefined();
      expect(log.userId).toBe(testUserId);
      expect(log.action).toBe('post.created');
      expect(log.metadata).toEqual({ postId: 'post-1' });
    });
  });

  describe('findByIdAndUserId', () => {
    it('본인 소유의 로그를 조회할 수 있다', async () => {
      testUserId = randomUUID();
      const created = await repository.create({
        userId: testUserId,
        action: 'post.created',
      });

      const found = await repository.findByIdAndUserId(
        String(created._id),
        testUserId,
      );

      expect(found).not.toBeNull();
      expect(found?.action).toBe('post.created');
    });

    it('다른 사용자의 로그를 조회하면 null을 반환한다 (IDOR 방지)', async () => {
      testUserId = randomUUID();
      const created = await repository.create({
        userId: testUserId,
        action: 'post.created',
      });

      const found = await repository.findByIdAndUserId(
        String(created._id),
        randomUUID(), // 다른 사용자 ID
      );

      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('userId로 로그 목록을 최신순으로 페이지네이션 조회한다', async () => {
      testUserId = randomUUID();
      // createdAt은 밀리초 단위라 연속 생성 시 값이 겹칠 수 있다 —
      // 정렬 검증을 위해 생성 시점 사이에 명확한 간격을 둔다.
      await repository.create({ userId: testUserId, action: 'action.1' });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await repository.create({ userId: testUserId, action: 'action.2' });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await repository.create({ userId: testUserId, action: 'action.3' });

      const { items, total } = await repository.findByUserId(testUserId, {
        skip: 0,
        limit: 2,
      });

      expect(total).toBe(3);
      expect(items).toHaveLength(2);
      expect(items[0].action).toBe('action.3'); // 최신순
    });
  });
});
