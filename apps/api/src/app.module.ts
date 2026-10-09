import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { DatabaseModule } from "./db/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
