import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

export interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
  path: string;
}

/**
 * Catches every unhandled exception so clients always receive a consistent,
 * non-leaking JSON envelope with a correlation id. HttpExceptions keep their
 * status/message; anything else becomes a generic 500 (details logged, not
 * returned) to avoid leaking internals.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const requestId =
      (request.headers["x-request-id"] as string | undefined) ||
      request.requestId ||
      randomUUID();
    response.setHeader("x-request-id", requestId);

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Internal server error";
    let error = "InternalServerError";
    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message) ? b.message.join(", ") : String(b.message ?? message);
        error = String(b.error ?? error);
      }
      error = exception.name;
    }

    if (status >= 500) {
      const detail = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${requestId}] ${request.method} ${request.url} -> ${status}: ${detail}`);
    } else {
      this.logger.warn(`[${requestId}] ${request.method} ${request.url} -> ${status}: ${message}`);
    }

    const envelope: ErrorEnvelope = {
      statusCode: status,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    response.status(status).json(envelope);
  }
}
