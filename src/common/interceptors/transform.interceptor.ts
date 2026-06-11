import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

export interface SuccessResponse {
  data: unknown;
  message?: string;
  meta?: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    return next.handle().pipe(
      map((result: unknown) => {
        if (result === undefined || result === null) {
          return { data: null, message: 'Operación exitosa' };
        }

        const paginated = result as PaginatedResult<unknown>;
        if (
          paginated &&
          Array.isArray(paginated.data) &&
          paginated.meta &&
          typeof paginated.meta.total === 'number'
        ) {
          return {
            data: paginated.data,
            meta: paginated.meta,
            message: 'Listado obtenido exitosamente',
          };
        }

        const obj = result as Record<string, unknown>;
        if (typeof result === 'object' && obj.message) {
          if (obj.data !== undefined) {
            return result;
          }
          return { data: null, message: obj.message };
        }

        return { data: result, message: 'Operación exitosa' };
      }),
    );
  }
}
