import { z } from "zod";
import { env } from "../config/env";
import { refreshAccessToken, session } from "./session";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string } };

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const token = session.getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${env.VITE_API_URL}${path}`, { ...init, headers });

  if (response.status === 401 && !retried) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      return request(path, schema, init, true);
    }
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as ErrorBody | null)?.error;
    throw new ApiError(error?.message ?? `HTTP ${response.status}`, response.status, error?.code);
  }

  return schema.parse(body);
}

export const apiClient = {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return request(path, schema);
  },
  post<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
    return request(path, schema, { method: "POST", body: JSON.stringify(body) });
  },
  patch<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
    return request(path, schema, { method: "PATCH", body: JSON.stringify(body) });
  },
  /** Для эндпоинтов без содержимого в ответе. */
  async postVoid(path: string, body: unknown): Promise<void> {
    await request(path, z.unknown(), { method: "POST", body: JSON.stringify(body) });
  },
};
