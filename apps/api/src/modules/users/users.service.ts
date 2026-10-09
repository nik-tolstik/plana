import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { PatchMeDto, UserDto } from "@plana/shared";
import { DB } from "../../db/database.module";
import type { Db } from "../../db/drizzle";
import { lists, users } from "../../db/schema";

export type UserRow = typeof users.$inferSelect;

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    timezone: row.timezone,
    theme: row.theme,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getById(id: string): Promise<UserRow> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException({ description: "Пользователь не найден" });
    }
    return user;
  }

  async createWithInbox(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRow> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: input.passwordHash,
        })
        .returning();
      if (!user) {
        throw new Error("Не удалось создать пользователя");
      }
      await tx.insert(lists).values({ userId: user.id, name: "Inbox", kind: "inbox", position: 0 });
      return user;
    });
  }

  async updateProfile(id: string, dto: PatchMeDto): Promise<UserDto> {
    if (dto.timezone !== undefined && !isValidTimezone(dto.timezone)) {
      throw new BadRequestException({ description: `Неизвестная таймзона: ${dto.timezone}` });
    }

    const [updated] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException({ description: "Пользователь не найден" });
    }
    return toUserDto(updated);
  }
}

function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
