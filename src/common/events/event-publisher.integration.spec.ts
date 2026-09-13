import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../../config/configuration.js';
import { RabbitMQModule } from '../../rabbitmq/rabbitmq.module.js';
import { RabbitMQConnectionService } from '../../rabbitmq/rabbitmq-connection.service.js';
import { EventPublisherService } from './event-publisher.service.js';
import { EventType, type PostCreatedEvent } from './event.types.js';

/**
 * emitDistributed()가 실제로 RabbitMQ에 메시지를 발행하는지,
 * 임시 큐를 nest-template.events Exchange에 바인딩해 직접 소비하며 검증한다.
 */
describe('EventPublisherService RabbitMQ 통합 테스트', () => {
  let module: TestingModule;
  let publisher: EventPublisherService;
  let connectionService: RabbitMQConnectionService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        EventEmitterModule.forRoot(),
        RabbitMQModule,
      ],
      providers: [EventPublisherService],
    }).compile();

    await module.init();
    publisher = module.get<EventPublisherService>(EventPublisherService);
    connectionService = module.get<RabbitMQConnectionService>(
      RabbitMQConnectionService,
    );
  });

  afterAll(async () => {
    await module.close();
  });

  it('emitDistributed()로 발행한 메시지를 실제로 소비할 수 있다', async () => {
    const queueName = `test.queue.${randomUUID()}`;
    const channel = await connectionService.createConsumerChannel({
      queueName,
      routingKey: EventType.POST_CREATED,
      queueOptions: { autoDelete: true, exclusive: true },
    });

    const received = new Promise<PostCreatedEvent>((resolve) => {
      channel.addSetup(async (ch: ConfirmChannel) => {
        await ch.consume(queueName, (msg: ConsumeMessage | null) => {
          if (!msg) return;
          resolve(JSON.parse(msg.content.toString()));
          ch.ack(msg);
        });
      });
    });

    const event: PostCreatedEvent = {
      eventId: randomUUID(),
      eventType: EventType.POST_CREATED,
      timestamp: new Date(),
      userId: 'user-1',
      data: { postId: 'post-1', authorId: 'user-1', title: '통합 테스트' },
    };

    await publisher.emitDistributed(event);

    const consumed = await received;
    expect(consumed.eventId).toBe(event.eventId);
    expect(consumed.data.title).toBe('통합 테스트');

    await connectionService.removeConsumerChannel(channel);
  });

  it('발행 후 채널을 풀에 반환한다 (누수 없음)', async () => {
    const before = connectionService.getChannelStats().publisherChannels
      .inUse;

    await publisher.emitDistributed({
      eventId: randomUUID(),
      eventType: EventType.POST_CREATED,
      timestamp: new Date(),
      data: { postId: 'post-2', authorId: 'user-1', title: '채널 반환 확인' },
    });

    const after = connectionService.getChannelStats().publisherChannels
      .inUse;
    expect(after).toBe(before);
  });
});
