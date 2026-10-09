import { z } from "zod";

export const USER_THEMES = ["system", "light", "dark"] as const;

export const userThemeSchema = z.enum(USER_THEMES);

export type UserTheme = z.infer<typeof userThemeSchema>;

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Минимум 8 символов").max(128),
  name: z.string().trim().min(1, "Имя не может быть пустым").max(100),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  timezone: z.string(),
  theme: userThemeSchema,
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type UserDto = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const patchMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    timezone: z.string().min(1).optional(),
    theme: userThemeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Хотя бы одно поле обязательно" });

export type PatchMeDto = z.infer<typeof patchMeSchema>;
