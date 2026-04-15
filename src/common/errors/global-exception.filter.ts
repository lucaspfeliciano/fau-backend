import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that catches all unhandled exceptions
 * and logs them with structured context.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const userId = (request as any).user?.id;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();

      // Log client errors (4xx) as warnings, server errors (5xx) as errors
      if (statusCode >= 500) {
        this.logger.error({
          message: `HTTP ${statusCode}: ${exception.message}`,
          statusCode,
          path: request.url,
          method: request.method,
          userId,
          error: errorResponse,
          stack: exception.stack,
        });
      } else if (statusCode >= 400) {
        this.logger.warn({
          message: `HTTP ${statusCode}: ${exception.message}`,
          statusCode,
          path: request.url,
          method: request.method,
          userId,
          error: errorResponse,
        });
      }

      response.status(statusCode).json({
        statusCode,
        path: request.url,
        timestamp: new Date().toISOString(),
        error: errorResponse,
      });
      return;
    }

    // Unhandled error (not HttpException)
    if (exception instanceof Error) {
      this.logger.error({
        message: `Unhandled error: ${exception.message}`,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: request.url,
        method: request.method,
        userId,
        error: {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        },
      });
    } else {
      this.logger.error({
        message: 'Unhandled non-error exception',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: request.url,
        method: request.method,
        userId,
        exception: String(exception),
      });
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: 'Internal server error.',
    });
  }
}
