import { expect, test } from '@playwright/test'

test.describe('localized home page', () => {
  test.use({ locale: 'ru-RU' })

  test('uses the browser locale before a locale cookie is set', async ({
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        name: 'Фундамент проекта готов к разработке функций',
      }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  })

  test('switches to English and persists the selected language', async ({
    context,
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto('/')

    const languageButton = page.getByRole('button', { name: /язык/i })

    await expect(languageButton).toHaveAttribute('aria-expanded', 'false')
    await languageButton.click()
    await expect(languageButton).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('menuitemradio', { name: 'Английский' }).click()

    await expect(
      page.getByRole('heading', {
        name: 'Project foundation is ready for feature work',
      }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    const localeCookie = (await context.cookies()).find(
      (cookie) => cookie.name === 'plana-locale',
    )

    expect(localeCookie?.value).toBe('en')

    await page.reload()

    await expect(
      page.getByRole('heading', {
        name: 'Project foundation is ready for feature work',
      }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})
