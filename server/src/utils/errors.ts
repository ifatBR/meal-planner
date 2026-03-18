import createError from '@fastify/error';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../constants';

const makeError = (code: string, message: string, status: number) => () =>
  new (createError(code, message, status))();

export const notFoundError = makeError(
  ERROR_CODES.NOT_FOUND,
  ERROR_MESSAGES.NOT_FOUND,
  HTTP_STATUS.NOT_FOUND,
);

export const unAuthorizedError = makeError(
  ERROR_CODES.UNAUTHORIZED,
  ERROR_MESSAGES.UNAUTHORIZED,
  HTTP_STATUS.UNAUTHORIZED,
);

export const forbiddenError = makeError(
  ERROR_CODES.FORBIDDEN,
  ERROR_MESSAGES.FORBIDDEN,
  HTTP_STATUS.FORBIDDEN,
);

export const conflictError = makeError(
  ERROR_CODES.CONFLICT,
  ERROR_MESSAGES.CONFLICT,
  HTTP_STATUS.CONFLICT,
);

export const ruleViolationError = makeError(
  ERROR_CODES.RULE_VIOLATION,
  ERROR_MESSAGES.RULE_VIOLATION,
  HTTP_STATUS.RULE_VIOLATION,
);

export const invalidRequestError = makeError(
  ERROR_CODES.INVALID_REQUEST,
  ERROR_MESSAGES.INVALID_REQUEST,
  HTTP_STATUS.INVALID_REQUEST,
);

export const internalError = makeError(
  ERROR_CODES.INTERNAL_ERROR,
  ERROR_MESSAGES.INTERNAL_ERROR,
  HTTP_STATUS.INTERNAL_ERROR,
);

export const isP2002 = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: string }).code === 'P2002';
