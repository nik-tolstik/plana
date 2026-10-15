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

/** Код ошибки Postgres из исключения или его причины (postgres.js PostgresError). */
function pgErrorCode(exception: unknown): string | undefined {
  const candidates = [exception, exception instanceof Error ? exception.cause : null];
  for (const candidate of candidates) {
    if (!(candidate instanceof Error)) {
      continue;
    }
    const code = (candidate as { code?: unknown }).code;
    if (candidate.name === "PostgresError" && typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

/** Приводит любые ошибки API к формату { error: { code, message, details? } } (см. docs/architecture/api.md). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    // Гонки check-then-insert (регистрация, теги, неявное создание тегов задачи)
    // прилетают сюда как unique violation — это конфликт, а не 500.
    if (pgErrorCode(exception) === "23505") {
      response.status(HttpStatus.CONFLICT).json({
        error: { code: "CONFLICT", message: "Запись уже существует" },
      });
      return;
    }

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
