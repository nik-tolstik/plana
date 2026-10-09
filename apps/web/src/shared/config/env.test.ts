import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("подставляет localhost, если VITE_API_URL не задан", () => {
    expect(parseEnv({}).VITE_API_URL).toBe("http://localhost:3000");
  });

  it("принимает корректный URL", () => {
    expect(parseEnv({ VITE_API_URL: "https://plana-api.up.railway.app" }).VITE_API_URL).toBe(
      "https://plana-api.up.railway.app",
    );
  });

  it("отклоняет не-URL", () => {
    expect(() => parseEnv({ VITE_API_URL: "not-a-url" })).toThrow();
  });
});
