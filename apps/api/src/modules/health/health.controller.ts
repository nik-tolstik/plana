import { Controller, Get } from "@nestjs/common";
import type { HealthDto } from "@plana/shared";
import { Public } from "../../common/public.decorator";
import { env } from "../../config/env";

@Controller("health")
@Public()
export class HealthController {
  @Get()
  getHealth(): HealthDto {
    return {
      status: "ok",
      version: env.APP_VERSION,
      env: env.NODE_ENV,
    };
  }
}
