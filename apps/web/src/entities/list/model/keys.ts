/** Ключи запросов структуры (сайдбар, секции). Все мутации структуры инвалидируют их. */
export const structureKeys = {
  all: ["structure"] as const,
  sidebar: ["structure", "sidebar"] as const,
  sections: (listId: string) => ["structure", "sections", listId] as const,
};
