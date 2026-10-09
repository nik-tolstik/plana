import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "@node-rs/argon2";
import type { AuthResponse, LoginDto, RegisterDto } from "@plana/shared";
import { and, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { refreshTokens } from "../../db/schema";
import { toUserDto, UsersService, type UserRow } from "../users/users.service";

const REFRESH_TTL_DAYS = 30;
const REFRESH_REUSE_MESSAGE = "Сессия отозвана, войдите снова";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        description: "Пользователь с таким email уже зарегистрирован",
      });
    }
    const passwordHash = await hash(dto.password);
    const user = await this.usersService.createWithInbox({ ...dto, passwordHash });
    return this.issueSession(user, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    const passwordOk =
      user?.passwordHash !== null &&
      user !== null &&
      (await verify(user.passwordHash, dto.password));
    if (!user || !passwordOk) {
      throw new UnauthorizedException({ description: "Неверный email или пароль" });
    }
    return this.issueSession(user, userAgent);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = sha256Hex(refreshToken);
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException({ description: REFRESH_REUSE_MESSAGE });
    }
    if (row.revokedAt !== null) {
      // Повторное использование отозванного токена — отзываем все сессии пользователя.
      await this.revokeAll(row.userId);
      throw new UnauthorizedException({ description: REFRESH_REUSE_MESSAGE });
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({ description: "Сессия истекла, войдите снова" });
    }

    const user = await this.usersService.getById(row.userId);
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, row.id));
    return this.issueSession(user, row.userAgent ?? undefined);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.tokenHash, sha256Hex(refreshToken)), isNull(refreshTokens.revokedAt)),
      );
  }

  async revokeAll(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  private async issueSession(user: UserRow, userAgent?: string): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: sha256Hex(refreshToken),
      expiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    });

    return { accessToken, refreshToken, user: toUserDto(user) };
  }
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
