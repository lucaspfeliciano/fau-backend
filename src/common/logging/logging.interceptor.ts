import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

/**
 * Interceptor that logs HTTP requests and errors across all routes.
 *
 * Logs:
 * - Incoming requests (method, url, user)
 * - Response status and duration
 * - Detailed error information with stack traces
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || 'unknown';
    const userId = (request as any).user?.id;
    const startTime = Date.now();

    this.logger.log({
      message: `→ ${method} ${url}`,
      method,
      url,
      ip,
      userAgent,
      userId,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        this.logger.log({
          message: `← ${method} ${url} ${statusCode} ${duration}ms`,
          method,
          url,
          statusCode,
          duration,
          userId,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error({
          message: `✗ ${method} ${url} ${statusCode} ${duration}ms - ${error.message}`,
          method,
          url,
          statusCode,
          duration,
          userId,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        });

        return throwError(() => error);
      }),
    );
  }
}
