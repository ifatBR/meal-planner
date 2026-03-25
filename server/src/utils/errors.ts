import createError from '@fastify/error';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../constants';
import type { AffectedSchedule } from '@app/types/common';

export class ScheduleConflictError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
    public readonly affectedSchedules: AffectedSchedule[],
  ) {
    super(message);
    this.name = 'ScheduleConflictError';
  }
}

export const isScheduleConflictError = (err: unknown): err is ScheduleConflictError =>
  err instanceof ScheduleConflictError;

export class LayoutConflictError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
    public readonly usedBySchedules: Array<{ id: string; name: string }>,
  ) {
    super(message);
    this.name = 'LayoutConflictError';
  }
}

const makeError = (code: string, message: string, status: number) => () =>
  new (createError(code, message, status))();

export const notFoundError = (entity?: string) =>
  makeError(
    ERROR_CODES.NOT_FOUND,
    entity ? `${entity} not found` : ERROR_MESSAGES.NOT_FOUND,
    HTTP_STATUS.NOT_FOUND,
  )();

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

export const conflictError = (entity?: string) =>
  makeError(
    ERROR_CODES.CONFLICT,
    entity ? `${entity} already exists` : ERROR_MESSAGES.CONFLICT,
    HTTP_STATUS.CONFLICT,
  )();

export const ruleViolationError = (message?: string) =>
  makeError(
    ERROR_CODES.RULE_VIOLATION,
    message ?? ERROR_MESSAGES.RULE_VIOLATION,
    HTTP_STATUS.RULE_VIOLATION,
  )();

export const invalidRequestError = (entity?: string, value?: string) =>
  makeError(
    ERROR_CODES.INVALID_REQUEST,
    entity ? `Invalid ${entity}${value ? `: "${value}"` : ''}` : ERROR_MESSAGES.INVALID_REQUEST,
    HTTP_STATUS.INVALID_REQUEST,
  )();

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
