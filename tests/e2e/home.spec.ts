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

  test('switches to the dark theme and persists it', async ({
    context,
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto('/')

    await expect(page.getByRole('tab', { name: 'Светлая' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.getByRole('tab', { name: 'Темная' }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)

    const themeCookie = (await context.cookies()).find(
      (cookie) => cookie.name === 'plana-theme',
    )

    expect(themeCookie?.value).toBe('dark')

    await page.reload()

    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('uses the system theme when selected', async ({ context, page }) => {
    await page.context().clearCookies()
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    await expect(page.getByRole('tab', { name: 'Светлая' })).toHaveAttribute(
      'tabindex',
      '0',
    )

    await page.getByRole('tab', { name: 'Система' }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('tab', { name: 'Система' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const themeCookie = (await context.cookies()).find(
      (cookie) => cookie.name === 'plana-theme',
    )

    expect(themeCookie?.value).toBe('system')

    await page.emulateMedia({ colorScheme: 'light' })

    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
