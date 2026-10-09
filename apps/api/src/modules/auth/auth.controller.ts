import { Body, Controller, Headers, Post } from "@nestjs/common";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  type AuthResponse,
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
} from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { Public } from "../../common/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Headers("user-agent") userAgent?: string,
  ): Promise<AuthResponse> {
    return this.authService.register(dto, userAgent);
  }

  @Public()
  @Post("login")
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Headers("user-agent") userAgent?: string,
  ): Promise<AuthResponse> {
    return this.authService.login(dto, userAgent);
  }

  @Public()
  @Post("refresh")
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post("logout-all")
  async logoutAll(@CurrentUserId() userId: string): Promise<void> {
    await this.authService.revokeAll(userId);
  }
}
