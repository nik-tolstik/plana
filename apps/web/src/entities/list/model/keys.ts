/** Ключи запросов структуры (сайдбар). Все мутации структуры инвалидируют их. */
export const structureKeys = {
  all: ["structure"] as const,
  sidebar: ["structure", "sidebar"] as const,
};
