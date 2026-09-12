import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from './error-code.enum.js';

/**
 * 자격증명(이메일/비밀번호 등)이 일치하지 않는 경우.
 * 존재하지 않는 계정과 틀린 비밀번호를 구분하지 않고 이 예외 하나로
 * 통일하면, 응답만으로 "이 계정이 존재하는지"를 추측하는 것을 막을 수 있다.
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({ code: ErrorCode.INVALID_CREDENTIALS });
  }
}

/**
 * 로그인 연속 실패로 계정이 잠긴 경우.
 * 부가 정보(재시도 대기시간 등)는 생성자 파라미터로 받는다.
 */
export class AccountLockedException extends UnauthorizedException {
  constructor(retryAfterSeconds: number) {
    super({ code: ErrorCode.ACCOUNT_LOCKED, retryAfterSeconds });
  }
}

/**
 * refresh token이 유효하지 않거나 만료된 경우.
 */
export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super({ code: ErrorCode.INVALID_REFRESH_TOKEN });
  }
}

/**
 * 회원가입 시 이미 사용 중인 이메일인 경우.
 * message는 사용자에게 그대로 보여줄 문구이므로 한글로 작성해도 된다 —
 * code와 달리 클라이언트 분기용이 아니라 표시용이기 때문이다.
 */
export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      code: ErrorCode.EMAIL_ALREADY_EXISTS,
      message: '이미 사용 중인 이메일입니다',
    });
  }
}

/**
 * 요청한 게시글이 존재하지 않는 경우.
 */
export class PostNotFoundException extends NotFoundException {
  constructor() {
    super({
      code: ErrorCode.POST_NOT_FOUND,
      message: '게시글을 찾을 수 없습니다',
    });
  }
}

/**
 * 게시글 작성자 본인이 아닌 사용자가 수정/삭제를 시도한 경우.
 */
export class PostForbiddenException extends ForbiddenException {
  constructor() {
    super({
      code: ErrorCode.POST_FORBIDDEN,
      message: '본인이 작성한 게시글만 수정/삭제할 수 있습니다',
    });
  }
}
