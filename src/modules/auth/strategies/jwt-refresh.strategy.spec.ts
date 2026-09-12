import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'jwt.refreshSecret')
                return 'test-refresh-secret-32-chars-min!';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  afterEach(() => vi.clearAllMocks());

  describe('validate', () => {
    it('유효한 refresh payload에서 JwtValidationResult를 반환한다', () => {
      const payload = {
        sub: 'user-uuid',
        email: 'test@example.com',
        role: 'USER',
        jti: 'token-uuid',
        exp: 1234567890,
        type: 'refresh' as const,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-uuid',
        email: 'test@example.com',
        role: 'USER',
        jti: 'token-uuid',
        exp: 1234567890,
      });
    });

    it('payload.type이 access이면 UnauthorizedException을 발생시킨다', () => {
      const payload = {
        sub: 'user-uuid',
        email: 'test@example.com',
        role: 'USER',
        jti: 'token-uuid',
        exp: 1234567890,
        type: 'access' as const,
      };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });
  });
});
