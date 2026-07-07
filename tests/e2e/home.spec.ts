import { expect, test } from '@playwright/test'

test('renders the home page', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: 'Project foundation is ready for feature work',
    }),
  ).toBeVisible()
  await expect(page.getByText('TanStack Query', { exact: true })).toBeVisible()
})
