/** Человекочитаемое сообщение об ошибке для UI. */
export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Что-то пошло не так";
}
