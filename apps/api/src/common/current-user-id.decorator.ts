import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/** ID пользователя из валидированного JWT (см. JwtStrategy). */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.id as string | undefined;
});
