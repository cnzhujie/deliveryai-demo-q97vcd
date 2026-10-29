import { test, expect, type Page } from '@playwright/test'

/** 手机视口下文档宽度不应超出视口（无横向滚动）。 */
async function expectNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const viewportWidth = page.viewportSize()?.width ?? 0
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)
}

/** 从首页绑定 A08、进入点餐、加一道锅底并提交，到达订单视图。 */
async function placeOneOrder(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Start Ordering/ }).click()
  await expect(page).toHaveURL(/#\/menu$/)
  await page.getByRole('button', { name: '锅底' }).click()
  const firstCard = page.locator('article').first()
  await firstCard.locator('button').last().scrollIntoViewIfNeeded()
  await firstCard.locator('button').last().click()
  await page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ }).click()
  await page.getByRole('button', { name: /查看购物车|View Cart/ }).click()
  await page.getByRole('button', { name: /提交加菜|Submit Additional/ }).click()
  await expect(page).toHaveURL(/#\/order$/)
}

test.describe('手机端响应式适配', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('MOBILE-001: 首页与欢迎页无横向滚动，底部无固定导航遮挡', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/home$/)
    await expectNoHorizontalScroll(page)

    await page.getByRole('button', { name: /A08/ }).first().click()
    await expect(page).toHaveURL(/#\/welcome$/)
    await expectNoHorizontalScroll(page)
    await expect(page.getByRole('button', { name: /进入点餐|Start Ordering/ })).toBeVisible()
  })

  test('MOBILE-002: 点餐到结账全流程无横向滚动，底部导航与悬浮购物车可用', async ({ page }) => {
    await placeOneOrder(page)
    await expectNoHorizontalScroll(page)

    // 底部四宫格导航可见且可切换
    const nav = page.locator('nav')
    await expect(nav.getByRole('button', { name: /点餐|Menu/ })).toBeVisible()
    await nav.getByRole('button', { name: /^服务$|^Service$/ }).click()
    await expect(page.getByRole('heading').filter({ hasText: /桌边服务|Table Service/ })).toBeVisible()
    await page.keyboard.press('Escape')

    // 去结账按钮不被底部导航遮挡（点击可生效）
    const checkout = page.getByRole('button', { name: /去结账|Checkout/ })
    await checkout.scrollIntoViewIfNeeded()
    await checkout.click()
    await expect(page).toHaveURL(/#\/checkout$/)
    await expectNoHorizontalScroll(page)
  })
})

test.describe('窄屏手机适配（320px）', () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true })

  test('MOBILE-003: 点餐与订单视图在 320px 下无横向滚动', async ({ page }) => {
    await placeOneOrder(page)
    await expectNoHorizontalScroll(page)
    await page.getByRole('button', { name: /去结账|Checkout/ }).click()
    await expect(page).toHaveURL(/#\/checkout$/)
    await expectNoHorizontalScroll(page)
  })
})
