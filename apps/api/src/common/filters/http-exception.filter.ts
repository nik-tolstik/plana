import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "PAYLOAD_TOO_LARGE",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
};

interface ExceptionPayload {
  description?: string;
  message?: string | string[];
  details?: unknown;
}

/** Приводит любые ошибки API к формату { error: { code, message, details? } } (см. docs/architecture/api.md). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        error: { code: "INTERNAL", message: "Внутренняя ошибка сервера" },
      });
      return;
    }

    const status = exception.getStatus();
    const payload = exception.getResponse();
    let message = exception.message;
    let details: unknown;

    if (typeof payload === "object" && payload !== null) {
      const data = payload as ExceptionPayload;
      if (typeof data.description === "string") {
        message = data.description;
      } else if (typeof data.message === "string") {
        message = data.message;
      } else if (Array.isArray(data.message)) {
        message = data.message[0] ?? message;
        details = data.message;
      }
      if (data.details !== undefined) {
        details = data.details;
      }
    } else if (typeof payload === "string") {
      message = payload;
    }

    response.status(status).json({
      error: {
        code: STATUS_TO_CODE[status] ?? "INTERNAL",
        message,
        ...(details === undefined ? {} : { details }),
      },
    });
  }
}
