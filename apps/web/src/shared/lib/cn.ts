import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Объединение классов утилитами + разрешение tailwind-конфликтов (последний выигрывает). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
