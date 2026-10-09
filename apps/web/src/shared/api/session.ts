import { authResponseSchema, type UserDto } from "@plana/shared";
import { env } from "../config/env";

const REFRESH_KEY = "plana.refreshToken";

let accessToken: string | null = null;
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);

type SessionListener = (user: UserDto) => void;
let sessionListener: SessionListener | null = null;

/**
 * Хранилище токенов: access — в памяти, refresh — в localStorage.
 * Компромисс MVP задокументирован в docs/architecture/api.md (auth).
 */
export const session = {
  setTokens(nextAccess: string, nextRefresh: string) {
    accessToken = nextAccess;
    refreshToken = nextRefresh;
    localStorage.setItem(REFRESH_KEY, nextRefresh);
  },
  clear() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
  getAccessToken() {
    return accessToken;
  },
  getRefreshToken() {
    return refreshToken;
  },
  setSessionListener(listener: SessionListener) {
    sessionListener = listener;
  },
};

let refreshInFlight: Promise<string | null> | null = null;

/** Обновляет access-токен по refresh-токену (single-flight). Возвращает новый access или null. */
export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const current = refreshToken;
      if (!current) {
        return null;
      }
      const response = await fetch(`${env.VITE_API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current }),
      });
      if (!response.ok) {
        session.clear();
        return null;
      }
      const data = authResponseSchema.parse(await response.json());
      session.setTokens(data.accessToken, data.refreshToken);
      sessionListener?.(data.user);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
