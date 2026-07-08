import type { Locale } from './locale'

type DeepStringMap<T> = {
  readonly [Key in keyof T]: T[Key] extends string
    ? string
    : DeepStringMap<T[Key]>
}

export const defaultNS = 'translation'

const enTranslation = {
  app: {
    name: 'Plana',
    title: 'Plana',
  },
  common: {
    close: 'Close',
  },
  home: {
    description:
      'The app is structured around FSD, TanStack Start, TanStack Query, Tailwind CSS, Base UI, React Hook Form, Zod, and Playwright.',
    stack: {
      routing: 'Routing',
      serverState: 'Server state',
      uiSystem: 'UI system',
    },
    title: 'Project foundation is ready for feature work',
  },
  language: {
    english: 'English',
    menuLabel: 'Language',
    russian: 'Russian',
    switcherLabel: 'Change language',
  },
} as const

const ruTranslation = {
  app: {
    name: 'Plana',
    title: 'Plana',
  },
  common: {
    close: 'Закрыть',
  },
  home: {
    description:
      'Приложение структурировано вокруг FSD, TanStack Start, TanStack Query, Tailwind CSS, Base UI, React Hook Form, Zod и Playwright.',
    stack: {
      routing: 'Роутинг',
      serverState: 'Серверное состояние',
      uiSystem: 'UI-система',
    },
    title: 'Фундамент проекта готов к разработке функций',
  },
  language: {
    english: 'Английский',
    menuLabel: 'Язык',
    russian: 'Русский',
    switcherLabel: 'Сменить язык',
  },
} as const satisfies DeepStringMap<typeof enTranslation>

export const resources = {
  en: {
    translation: enTranslation,
  },
  ru: {
    translation: ruTranslation,
  },
} as const satisfies Record<
  Locale,
  { translation: DeepStringMap<typeof enTranslation> }
>

export function getAppTitle(locale: Locale) {
  return resources[locale].translation.app.title
}
