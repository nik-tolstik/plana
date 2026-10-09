import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { DatabaseModule } from "../../db/database.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
