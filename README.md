# nest-template

NestJS 프로젝트를 새로 시작할 때 반복적으로 구성하는 보일러플레이트를 미리 갖춰둔 템플릿 저장소입니다. 이 저장소를 그대로 복제해 새 프로젝트의 시작점으로 사용합니다.

## 포함된 기능

- **환경설정**: `@nestjs/config` + `joi` — 환경변수 구조화 및 앱 기동 시 유효성 검증
- **로깅**: Winston — 파일 로테이션, 민감정보 마스킹, HTTP 요청/응답 자동 로깅
- **예외 처리**: 도메인 커스텀 예외 클래스 + 전역 `ExceptionFilter` — 응답 스키마 통일, Prisma 에러 자동 변환
- **데이터베이스**
  - PostgreSQL (Prisma) — 메인 DB, Repository 패턴
  - MongoDB (Mongoose) — 비정형·이력성 데이터용
- **인증**: JWT Access/Refresh 토큰, 로그아웃 시 Access 블랙리스트(Redis) + Refresh DB 삭제
- **캐시/세션**: Redis (ioredis)
- **메시지 큐**: RabbitMQ (amqplib) — 이벤트 발행/구독(로컬 + 분산)
- **Rate Limiting**: `@nestjs/throttler` — 3단계 프로파일(short/medium/long), Redis 저장소로 다중 인스턴스 공유
- **API 문서화**: Swagger (OpenAPI)
- **페이지네이션**: 오프셋 기반 공통 유틸 + Swagger 제네릭 응답
- **예시 도메인**: `posts`(Prisma), `activity-logs`(MongoDB) — 실제 CRUD와 위 기능들의 연동 방식을 코드로 확인 가능

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | NestJS 12 |
| 언어 | TypeScript (ESM) |
| 패키지 매니저 | pnpm |
| RDB | PostgreSQL + Prisma 7 |
| NoSQL | MongoDB + Mongoose |
| 캐시 | Redis (ioredis) |
| 메시지 큐 | RabbitMQ |
| 인증 | Passport + JWT |
| 테스트 | Vitest + Supertest |
| 린트/포맷 | oxlint + Prettier |

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

`postinstall`에서 `prisma generate`가 자동 실행됩니다.

### 2. 인프라 기동

Docker Compose로 PostgreSQL / MongoDB / Redis / RabbitMQ를 한 번에 띄웁니다.

```bash
docker compose up -d
docker compose ps   # 4개 서비스 모두 healthy 상태 확인
```

| 서비스 | 포트 | 접속 정보 |
|--------|------|-----------|
| PostgreSQL | 5432 | `nest` / `nest` / `nest_template` |
| MongoDB | 27017 | `nest` / `nest` / `nest_template` |
| Redis | 6379 | password: `nest` |
| RabbitMQ | 5672 (AMQP), 15672 (관리 UI) | `nest` / `nest` |

RabbitMQ 관리 UI: http://localhost:15672

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env.example`의 기본값은 위 Docker Compose 설정과 그대로 맞춰져 있어 로컬 개발은 별도 수정 없이 바로 동작합니다. `JWT_SECRET`, `JWT_REFRESH_SECRET`는 운영 환경에서 반드시 32자 이상의 값으로 교체하세요.

### 4. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev
```

### 5. 앱 실행

```bash
pnpm start:dev
```

- API 서버: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

## 스크립트

```bash
pnpm start:dev      # 개발 서버 (watch 모드)
pnpm build          # 프로덕션 빌드
pnpm start:prod     # 빌드 결과 실행

pnpm test           # 단위/통합 테스트
pnpm test:e2e       # E2E 테스트 (인프라 필요)
pnpm test:cov       # 커버리지 포함 테스트

pnpm lint           # oxlint
pnpm format         # Prettier
```

## 프로젝트 구조

```
src/
├── common/                   # 도메인에 속하지 않는 공통 기능
│   ├── events/                 # 이벤트 타입, 발행 서비스(EventPublisherService), EventsModule
│   ├── exception/               # 커스텀 예외, 전역 ExceptionFilter
│   ├── logging/                  # HTTP 로깅 인터셉터
│   ├── pagination/                # 페이지네이션 DTO/유틸/Swagger 데코레이터
│   ├── swagger/                    # 공통 Swagger 응답 데코레이터
│   └── throttler/                   # Rate Limiting 커스텀 가드
├── config/                    # 환경변수(configuration.ts), joi 검증 스키마, Winston 설정
├── database/                  # 인프라 연결 모듈
│   ├── mongodb/
│   ├── prisma/
│   └── redis/
├── rabbitmq/                  # RabbitMQ 연결/채널 관리
├── modules/                   # 도메인 모듈
│   ├── auth/                    # 회원가입/로그인/재발급/로그아웃
│   ├── users/                    # 사용자 Repository
│   ├── posts/                    # 예시 도메인 (Prisma) — 이벤트 발행 연동 포함
│   └── activity-logs/            # 예시 도메인 (MongoDB)
├── app.module.ts
└── main.ts
prisma/
└── schema.prisma
test/
├── auth.e2e-spec.ts
├── posts.e2e-spec.ts
└── utils/create-test-app.ts   # E2E용 앱 부트스트랩 헬퍼
docker-compose.yml             # 로컬 인프라 4종
```

## 새 도메인 추가하기

`posts`(Prisma) 또는 `activity-logs`(MongoDB) 모듈을 참고해 아래 패턴을 따릅니다.

1. `prisma/schema.prisma`에 모델 추가 후 `npx prisma migrate dev --name add_{domain}` (Mongo는 `schemas/{domain}.schema.ts`에 `@Schema` 클래스 정의)
2. `dto/`에 Create/Update/Response DTO 작성 (`@ApiProperty`, `class-validator` 데코레이터 포함)
3. `repositories/{domain}.repository.ts` — DB 접근만 담당
4. `{domain}.service.ts` — 비즈니스 로직, 필요 시 `EventPublisherService.emitAll()`로 이벤트 발행
5. `{domain}.controller.ts` — `@ApiTags`, `@ApiBearerAuth('access-token')`, 공개 엔드포인트는 `@Public()`
6. `{domain}.module.ts`를 `app.module.ts`에 등록

인증이 필요 없는 엔드포인트에는 `@Public()`을 붙이세요. 전역 `JwtAuthGuard`가 기본적으로 모든 요청에 인증을 요구합니다.

## 인증 흐름

```
POST /auth/register  → 회원가입 + 자동 로그인 (accessToken, refreshToken 발급)
POST /auth/login      → 로그인
POST /auth/refresh    → refreshToken으로 재발급 (Authorization 헤더에 refreshToken 사용)
POST /auth/logout     → accessToken 블랙리스트 등록 + refreshToken DB 삭제
```

로그아웃은 Access Token(Redis 블랙리스트, `jti` 기준)과 Refresh Token(DB의 `refreshTokenHash` 삭제)을 모두 즉시 무효화합니다.

## 라이선스

UNLICENSED
