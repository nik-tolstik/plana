import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      version: process.env.APP_VERSION ?? "dev",
      env: process.env.NODE_ENV ?? "development",
    };
  }
}
