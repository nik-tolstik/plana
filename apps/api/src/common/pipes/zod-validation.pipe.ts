import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** Валидация тела/параметров zod-схемой из @plana/shared. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        description: "Ошибка валидации данных",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
