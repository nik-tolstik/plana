import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Отмечает эндпоинт как доступный без Authorization (глобальный guard проверяет). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
