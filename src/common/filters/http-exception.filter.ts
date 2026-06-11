import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MongoError } from 'mongodb';

interface MongoDuplicateError extends MongoError {
  code: 11000 | 11001;
  keyPattern?: Record<string, number>;
}

interface MongoCastError extends Error {
  name: 'CastError';
  kind: string;
}

interface MongoValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { message: string }>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const msg = (res as Record<string, unknown>).message;
        if (typeof msg === 'string') {
          message = msg;
        } else if (Array.isArray(msg)) {
          message = String(msg[0]);
        }
      }
    } else if (this.isMongoDuplicate(exception)) {
      status = HttpStatus.CONFLICT;
      const keyPattern = exception.keyPattern
        ? Object.keys(exception.keyPattern).join(', ')
        : '';
      message = keyPattern
        ? `El recurso ya existe (${keyPattern})`
        : 'El recurso ya existe';
    } else if (this.isCastError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = 'ID inválido';
    } else if (this.isValidationError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = Object.values(exception.errors)
        .map((e: { message: string }) => e.message)
        .join(', ');
    }

    response.status(status).json({
      data: null,
      message,
      statusCode: status,
    });
  }

  private isMongoDuplicate(err: unknown): err is MongoDuplicateError {
    const e = err as MongoDuplicateError;
    return e?.code === 11000 || e?.code === 11001;
  }

  private isCastError(err: unknown): err is MongoCastError {
    const e = err as MongoCastError;
    return e?.name === 'CastError' && e?.kind === 'ObjectId';
  }

  private isValidationError(err: unknown): err is MongoValidationError {
    const e = err as MongoValidationError;
    return e?.name === 'ValidationError' && !!e?.errors;
  }
}
