import { test, expect, type Page } from '@playwright/test'

const storeRow = (page: Page, id: string) => page.locator(`[data-testid="store-row"][data-store-id="${id}"]`)

/** 打开首页门店卡片上的选择器入口。 */
async function openPickerFromHome(page: Page) {
  await page.getByRole('button', { name: '切换当前下单门店' }).click()
}

/** 打开 TopBar 门店胶囊入口（兼容中/英界面）。 */
async function openPickerFromTopBar(page: Page) {
  await page.getByRole('button', { name: /^切换门店|^Switch store/ }).click()
}

/** 绑定指定桌台并进入点餐页（默认店国贸用 A08）。 */
async function enterMenu(page: Page, code = 'A08') {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(code) }).first().click()
  await page.getByRole('button', { name: /进入点餐/ }).click()
  await expect(page).toHaveURL(/#\/menu$/)
}

/** 在菜单页把第一个菜品（默认规格）加入购物车。 */
async function addFirstDishToCart(page: Page) {
  await page.locator('article').first().locator('button').last().click()
  await page.getByRole('button', { name: '加入本桌购物车' }).click()
  await expect(page.getByText('本桌购物车').first()).toBeVisible()
}

/** 从首页选择器切到望京店（空会话，直接切换）。 */
async function switchToWangjingFromHome(page: Page) {
  await openPickerFromHome(page)
  await storeRow(page, 'wangjing').click()
  await expect(page.getByText(/已切换至.*望京店/)).toBeVisible()
  await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
}

test.describe('切换分店 - 主路径与默认店', () => {
  test('STORE-001: 主路径 选店→绑桌→下单，新店桌台为该店配置', async ({ page }) => {
    await page.goto('/')
    // 首页卡片展示真实当前门店（默认国贸旗舰店；卡片可访问名为 aria-label，故按文本断言）
    await expect(page.getByText('沸点火锅·国贸旗舰店', { exact: true })).toBeVisible()

    // 首页卡片入口打开选择器，三家中含打烊的三里屯；未开通点单的上地店不出现在列表
    await openPickerFromHome(page)
    await expect(page.getByText('选择门店', { exact: true })).toBeVisible()
    await expect(storeRow(page, 'guomao')).toBeVisible()
    await expect(storeRow(page, 'wangjing')).toBeVisible()
    await expect(storeRow(page, 'sanlitun')).toBeVisible()
    await expect(storeRow(page, 'shangdi')).toHaveCount(0)

    // 切到望京店：toast、首页桌台换成望京配置（无 A08，有 E05）
    await storeRow(page, 'wangjing').click()
    await expect(page.getByText(/已切换至.*望京店/)).toBeVisible()
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /A08/ })).toHaveCount(0)

    // 绑桌 → 欢迎页展示新店名 → 进入点餐，TopBar 胶囊展示望京店
    await page.getByRole('button', { name: /E05/ }).first().click()
    await expect(page.getByRole('heading', { name: /望京店/ })).toBeVisible()
    await page.getByRole('button', { name: /进入点餐/ }).click()
    await expect(page).toHaveURL(/#\/menu$/)
    await expect(page.getByRole('button', { name: /^切换门店.*望京店/ })).toBeVisible()

    // 下单主路径
    await addFirstDishToCart(page)
    await page.getByRole('button', { name: '确认并提交订单' }).click()
    await expect(page).toHaveURL(/#\/order$/)
    await expect(page.getByRole('button', { name: '去结账' })).toBeVisible()
  })

  test('STORE-002: TopBar 入口可搜索过滤，打烊门店置灰点击仅提示不可选', async ({ page }) => {
    await enterMenu(page)
    await openPickerFromTopBar(page)

    // 搜索按商圈/名称过滤
    await page.getByPlaceholder(/搜索门店名/).fill('三里屯')
    await expect(storeRow(page, 'sanlitun')).toBeVisible()
    await expect(storeRow(page, 'wangjing')).toHaveCount(0)

    // 无结果空态
    await page.getByPlaceholder(/搜索门店名/).fill('不存在的门店')
    await expect(page.getByText('未找到匹配的门店')).toBeVisible()
    await page.getByPlaceholder(/搜索门店名/).clear()

    // 打烊门店 aria-disabled 但保留点击反馈：force 点击后只提示不切换
    await storeRow(page, 'sanlitun').click({ force: true })
    await expect(page.getByText(/该门店今日已打烊，营业时间 10:00–22:00/)).toBeVisible()
    await expect(storeRow(page, 'guomao')).toBeVisible() // 选择器仍停留

    // 关闭后当前门店仍是国贸
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /国贸旗舰店/ })).toBeVisible()
  })

  test('STORE-003: 默认店优先级 深链接 > localStorage > 默认店，非法 id 回落并有提示', async ({ page }) => {
    await page.goto('/')
    await switchToWangjingFromHome(page)

    // 刷新后仍记住望京店
    await page.reload()
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()

    // 深链接优先级高于 localStorage
    await page.goto('/?store=guomao')
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()

    // 伪造门店 id：回落默认店并 toast
    await page.goto('/?store=not-a-store')
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expect(page.getByText('门店信息无效，已为你切换默认门店')).toBeVisible()

    // 深链接指向打烊门店：回落营业门店并说明原因
    await page.goto('/?store=sanlitun')
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expect(page.getByText('该门店今日已打烊，已为你切换到营业中的门店')).toBeVisible()
  })
})

test.describe('切换分店 - 会话状态 guard', () => {
  test('STORE-004: 购物车有菜时二次确认，取消不变、确认清空并切换', async ({ page }) => {
    await enterMenu(page)
    await addFirstDishToCart(page)

    await openPickerFromTopBar(page)
    await storeRow(page, 'wangjing').click()

    // 确认弹窗与后果说明
    await expect(page.getByRole('heading', { name: '确认切换门店？' })).toBeVisible()
    await expect(page.getByText(/切换后购物车将清空/)).toBeVisible()

    // 取消：门店与购物车均不变
    await page.getByRole('button', { name: '取消' }).click()
    await expect(page.getByRole('button', { name: /国贸旗舰店/ })).toBeVisible()
    await expect(page.getByText('共 1 份菜品')).toBeVisible()

    // 再次切换并确认：回到首页、桌台换店、购物车已清空
    await openPickerFromTopBar(page)
    await storeRow(page, 'wangjing').click()
    await page.getByRole('button', { name: '确认切换' }).click()
    await expect(page).toHaveURL(/#\/home$/)
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
    await page.getByRole('button', { name: /E05/ }).first().click()
    await page.getByRole('button', { name: /进入点餐/ }).click()
    await expect(page.getByText('这一锅，还差点心动')).toBeVisible()
  })

  test('STORE-005: 有等待中服务呼叫时二次确认，取消则停留原店', async ({ page }) => {
    await enterMenu(page)
    await page.getByRole('button', { name: '呼叫服务' }).click()
    // 服务按钮可访问名含描述文案，取第一个匹配（网格中的「加汤」，先于底部一键呼叫）
    await page.getByRole('button', { name: /加汤/ }).first().click()
    await page.keyboard.press('Escape')

    await openPickerFromTopBar(page)
    await storeRow(page, 'wangjing').click()
    await expect(page.getByRole('heading', { name: '确认切换门店？' })).toBeVisible()
    await expect(page.getByText(/未响应的服务呼叫将取消/)).toBeVisible()

    await page.getByRole('button', { name: '取消' }).click()
    await expect(page.getByRole('button', { name: /国贸旗舰店/ })).toBeVisible()
  })

  test('STORE-006: 有未支付订单时禁止切换，引导结账，会话不变', async ({ page }) => {
    await enterMenu(page)
    await addFirstDishToCart(page)
    await page.getByRole('button', { name: '确认并提交订单' }).click()
    await expect(page).toHaveURL(/#\/order$/)

    await openPickerFromTopBar(page)
    await storeRow(page, 'wangjing').click()

    await expect(page.getByRole('heading', { name: '暂无法切换门店' })).toBeVisible()
    await expect(page.getByText(/尚未支付的订单，请先完成结账/)).toBeVisible()
    await expect(page.getByRole('button', { name: '去结账' })).toBeVisible()

    await page.getByRole('button', { name: '知道了' }).click()
    await expect(page).toHaveURL(/#\/order$/)
    await expect(page.getByRole('button', { name: /国贸旗舰店/ })).toBeVisible()
  })

  test('STORE-007: 已支付后确认可切换，语言与老人模式保持不变', async ({ page }) => {
    await enterMenu(page)
    await addFirstDishToCart(page)
    await page.getByRole('button', { name: '确认并提交订单' }).click()
    await page.getByRole('button', { name: '去结账' }).click()
    await page.getByRole('button', { name: /确认支付/ }).click()
    await expect(page.getByRole('heading', { name: '付款完成' })).toBeVisible()

    // 设备偏好：英文 + 老人模式
    await page.getByRole('button', { name: '切换语言' }).click()
    await page.getByRole('button', { name: '切换至老人模式' }).click()

    await openPickerFromTopBar(page)
    await storeRow(page, 'wangjing').click()
    await expect(page.getByText(/This meal is settled/)).toBeVisible()
    await page.getByRole('button', { name: /确认切换|Confirm Switch/ }).click()

    // 回到首页新店；语言与老人模式保留
    await expect(page).toHaveURL(/#\/home$/)
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('STORE-008: 两店沽清互不影响，切换后售罄标记按新店渲染', async ({ page }) => {
    await enterMenu(page)
    // 国贸默认沽清 p8 山野菌菇拼盘；p9 手工宽粉在售
    await expect(page.locator('article', { hasText: '山野菌菇拼盘' }).getByText('今日售罄')).toBeVisible()
    await expect(page.locator('article', { hasText: '手工宽粉' }).getByText('今日售罄')).toHaveCount(0)

    // 空会话直接切店（order 视图回到首页）
    await openPickerFromTopBar(page)
    await storeRow(page, 'wangjing').click()
    await page.getByRole('button', { name: /E05/ }).first().click()
    await page.getByRole('button', { name: /进入点餐/ }).click()

    // 望京默认沽清 p9，p8 在售
    await expect(page.locator('article', { hasText: '手工宽粉' }).getByText('今日售罄')).toBeVisible()
    await expect(page.locator('article', { hasText: '山野菌菇拼盘' }).getByText('今日售罄')).toHaveCount(0)
  })
})

test.describe('切换分店 - 桌台隔离与异常态', () => {
  test('STORE-009: 非本店桌台深链接无法绑定，提示桌台与门店不匹配', async ({ page }) => {
    await page.goto('/?store=wangjing#/welcome')
    await expect(page).toHaveURL(/#\/home$/)
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /A08/ })).toHaveCount(0)
    await expect(page.getByText('桌台与门店不匹配，请重新扫码')).toBeVisible()
  })

  test('STORE-010: 深链接到未开通点单门店进入空态页，可选其他门店', async ({ page }) => {
    await page.goto('/?store=shangdi')
    await expect(page.getByRole('heading', { name: '该门店未开通线上点单' })).toBeVisible()
    await expect(page.getByText(/上地店/)).toBeVisible()

    await page.getByRole('button', { name: '选择其他门店' }).click()
    await expect(storeRow(page, 'shangdi')).toHaveCount(0)
    await storeRow(page, 'guomao').click()

    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
  })

  test('STORE-011: 门店列表加载失败显示错误态与重试，重试成功', async ({ page }) => {
    await page.goto('/?storesApi=fail')
    await openPickerFromHome(page)
    await expect(page.getByText('门店列表加载失败')).toBeVisible()
    await page.getByRole('button', { name: '重试' }).click()
    await expect(storeRow(page, 'guomao')).toBeVisible()
  })

  test('STORE-012: 定位被拒绝不阻断，提示后仍可手动选店', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_success, error) => {
        error?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1 } as GeolocationPositionError)
      }
    })
    await page.goto('/')
    await openPickerFromHome(page)
    await expect(storeRow(page, 'guomao')).toBeVisible()

    await page.getByRole('button', { name: /附近门店/ }).click()
    await expect(page.getByText('定位未开启，可手动搜索选择门店')).toBeVisible()

    // 列表仍可用，手动选择不报错
    await storeRow(page, 'wangjing').click()
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
  })

  test('STORE-013: 移动端底部弹层可正常选店', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await openPickerFromHome(page)
    await expect(page.getByText('选择门店', { exact: true })).toBeVisible()
    await storeRow(page, 'wangjing').click()
    await expect(page.getByRole('button', { name: /E05/ }).first()).toBeVisible()
  })

  test('STORE-014: 390px 移动端 TopBar 门店胶囊店名可见（中英双语），防 flex 压零回归', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await enterMenu(page, 'A08')

    const capsuleName = page.getByTestId('store-capsule-name')
    await expect(capsuleName).toHaveText(/国贸旗舰店/)
    // truncate 元素被 flex 压缩时 clientWidth 会是 0；这里要求有可辨认的文字宽度
    await expect.poll(async () => (await capsuleName.boundingBox())?.width ?? 0, { timeout: 5000 }).toBeGreaterThan(60)

    // 英文店名更长，切英文后同样必须可见
    await page.getByRole('button', { name: '切换语言' }).click()
    await expect(capsuleName).toHaveText(/Guomao/i)
    await expect.poll(async () => (await capsuleName.boundingBox())?.width ?? 0, { timeout: 5000 }).toBeGreaterThan(60)
  })
})
