import type { Preview } from '@storybook/react-vite'
import { createElement } from 'react'

import '../src/styles.css'
import { I18nProvider } from '../src/app/providers'

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(I18nProvider, { locale: 'en' }, createElement(Story)),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
