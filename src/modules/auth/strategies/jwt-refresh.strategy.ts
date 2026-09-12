import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  JwtPayload,
  JwtValidationResult,
} from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Access Token과 다른 시크릿 키를 사용해야 보안이 강화됩니다
      secretOrKey: configService.get<string>('jwt.refreshSecret') as string,
    });
  }

  validate(payload: JwtPayload): JwtValidationResult {
    // Refresh Token만 허용 — Access Token으로 재발급 요청 차단
    if (payload.type && payload.type !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 토큰 타입입니다');
    }
    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      !payload.jti ||
      !payload.exp
    ) {
      throw new UnauthorizedException('토큰에 필수 정보가 누락되었습니다');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
