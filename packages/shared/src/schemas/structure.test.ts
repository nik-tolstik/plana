import { describe, expect, it } from "vitest";
import {
  createListSchema,
  listColorSchema,
  patchListSchema,
  sidebarDtoSchema,
} from "./structure.js";
import type { ListDto } from "./structure.js";

const list: ListDto = {
  id: "0b918ea2-9cc7-4db4-9c05-1d5a7a2f5f1c",
  folderId: null,
  name: "Inbox",
  color: "gray",
  emoji: null,
  kind: "inbox",
  position: 0,
  trashedAt: null,
  createdAt: "2026-10-10T10:00:00.000Z",
  updatedAt: "2026-10-10T10:00:00.000Z",
};

describe("listColorSchema", () => {
  it("принимает ключи палитры", () => {
    expect(listColorSchema.parse("teal")).toBe("teal");
  });

  it("отклоняет произвольные CSS-цвета", () => {
    expect(() => listColorSchema.parse("#ff0000")).toThrow();
  });
});

describe("createListSchema", () => {
  it("обрезает пробелы и принимает минимальный набор полей", () => {
    expect(createListSchema.parse({ name: "  Проект  " })).toEqual({
      name: "Проект",
    });
  });

  it("отклоняет пустое название", () => {
    expect(() => createListSchema.parse({ name: "   " })).toThrow();
  });

  it("принимает folderId: null и эмодзи", () => {
    expect(createListSchema.parse({ name: "Дом", emoji: "🏠", folderId: null })).toEqual({
      name: "Дом",
      emoji: "🏠",
      folderId: null,
    });
  });
});

describe("patchListSchema", () => {
  it("отклоняет пустой объект", () => {
    expect(() => patchListSchema.parse({})).toThrow();
  });

  it("принимает перемещение в корень через folderId: null", () => {
    expect(patchListSchema.parse({ folderId: null })).toEqual({ folderId: null });
  });
});

describe("sidebarDtoSchema", () => {
  it("валидирует дерево сайдбара", () => {
    const dto = {
      inbox: list,
      rootLists: [list],
      folders: [
        {
          id: list.id,
          name: "Работа",
          position: 0,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          lists: [list],
        },
      ],
    };
    expect(sidebarDtoSchema.parse(dto)).toEqual(dto);
  });

  it("отклоняет дерево без inbox", () => {
    expect(() => sidebarDtoSchema.parse({ inbox: null, rootLists: [], folders: [] })).toThrow();
  });
});
