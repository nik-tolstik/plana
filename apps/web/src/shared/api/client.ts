import type { z } from "zod";
import { env } from "../config/env";

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

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.VITE_API_URL}${path}`, init);
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
};
