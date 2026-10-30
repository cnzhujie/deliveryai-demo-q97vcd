// 门店数据层。
// 本期 demo：STORES 静态数据 + listStores() 模拟异步读取，前端不依赖 server。
// 正式产品契约：GET /api/stores?lat=&lng=&city=&keyword= 返回 Store[]；
// 届时仅把 listStores 替换为 fetch 实现，选择器与切换交互不变。

export type StoreStatus = 'open' | 'closed'

export interface StoreTable {
  code: string
  areaKey: string
  seats: number
}

export interface Store {
  id: string
  nameKey: string // i18n key，如 'store.names.guomao'
  city: string
  districtKey: string // i18n key
  addressKey: string // i18n key
  status: StoreStatus
  hours: string // 如 '10:00–22:00'，数字与符号不随语言变化
  orderingEnabled: boolean // 是否开通线上点单；未开通的门店不出现在选择器列表
  location?: { lat: number; lng: number }
  distanceMeters?: number // 契约预留：服务端可直接返回距离
  tables: StoreTable[]
  soldOut: string[] // 该店默认沽清商品 id
}

export const STORES: Store[] = [
  {
    id: 'guomao',
    nameKey: 'store.names.guomao',
    city: '北京',
    districtKey: 'store.districts.guomao',
    addressKey: 'store.addresses.guomao',
    status: 'open',
    hours: '10:00–22:00',
    orderingEnabled: true,
    location: { lat: 39.9085, lng: 116.4594 },
    distanceMeters: 320,
    tables: [
      { code: 'A08', areaKey: 'bind.area.hall', seats: 4 },
      { code: 'B12', areaKey: 'bind.area.booth', seats: 6 },
      { code: 'C06', areaKey: 'bind.area.room', seats: 4 },
      { code: 'D03', areaKey: 'bind.area.window', seats: 6 },
    ],
    soldOut: ['p8'],
  },
  {
    id: 'wangjing',
    nameKey: 'store.names.wangjing',
    city: '北京',
    districtKey: 'store.districts.wangjing',
    addressKey: 'store.addresses.wangjing',
    status: 'open',
    hours: '10:00–22:00',
    orderingEnabled: true,
    location: { lat: 39.9965, lng: 116.4685 },
    distanceMeters: 1800,
    tables: [
      { code: 'E05', areaKey: 'bind.area.hall', seats: 4 },
      { code: 'F09', areaKey: 'bind.area.booth', seats: 6 },
      { code: 'G02', areaKey: 'bind.area.room', seats: 8 },
      { code: 'H07', areaKey: 'bind.area.window', seats: 4 },
    ],
    soldOut: ['p9'],
  },
  {
    id: 'sanlitun',
    nameKey: 'store.names.sanlitun',
    city: '北京',
    districtKey: 'store.districts.sanlitun',
    addressKey: 'store.addresses.sanlitun',
    status: 'closed',
    hours: '10:00–22:00',
    orderingEnabled: true,
    location: { lat: 39.9366, lng: 116.4552 },
    distanceMeters: 4200,
    tables: [
      { code: 'A11', areaKey: 'bind.area.hall', seats: 2 },
      { code: 'B05', areaKey: 'bind.area.booth', seats: 4 },
    ],
    soldOut: [],
  },
  // 契约/异常态夹具：营业中但未开通线上点单，按方案第五节不出现在选择器列表，
  // 仅用于演示深链接 ?store=shangdi 的「未开通线上点单」空态页。
  {
    id: 'shangdi',
    nameKey: 'store.names.shangdi',
    city: '北京',
    districtKey: 'store.districts.shangdi',
    addressKey: 'store.addresses.shangdi',
    status: 'open',
    hours: '10:00–21:30',
    orderingEnabled: false,
    location: { lat: 40.0326, lng: 116.3058 },
    tables: [],
    soldOut: [],
  },
]

export const DEFAULT_STORE_ID = 'guomao'

export const getStore = (id: string): Store | undefined => STORES.find((store) => store.id === id)

export const defaultStore = (): Store => getStore(DEFAULT_STORE_ID) ?? STORES[0]

/** 可切换的门店：已开通线上点单（含打烊置灰展示）；未开通门店对顾客不可见。 */
export const listVisibleStores = (stores: Store[]): Store[] => stores.filter((store) => store.orderingEnabled)

/** 当前可作为下单上下文的门店：营业中且开通线上点单。 */
export const isStoreSelectable = (store: Store): boolean => store.status === 'open' && store.orderingEnabled

export const storeHasTable = (store: Store, code: string): boolean => store.tables.some((table) => table.code === code)

// ---- 设备级偏好：localStorage 不可用时降级内存态（与 i18nextLng / elderly-mode 同机制） ----

const CURRENT_STORE_KEY = 'currentStoreId'
let memoryStoreId: string | null = null

export function rememberStore(id: string): void {
  memoryStoreId = id
  try {
    localStorage.setItem(CURRENT_STORE_KEY, id)
  } catch {
    // localStorage 不可用时降级为内存态
  }
}

export function getRememberedStoreId(): string | null {
  try {
    return localStorage.getItem(CURRENT_STORE_KEY) ?? memoryStoreId
  } catch {
    return memoryStoreId
  }
}

// ---- 首次进入的默认门店解析：深链接 > localStorage > 定位 > 默认店 ----
// 定位按方案第八节默认决策：不主动弹授权，首进不申请定位（定位优先级在用户点击
// 「附近门店」时于选择器内生效），故此处直接落到默认店。

export type StoreNotice = 'invalid' | 'closed' | 'unavailable'

export interface InitialStoreResolution {
  /** 最终可用的当前门店（恒为营业中且开通点单）。 */
  storeId: string
  /** 回落时 toast 一次说明原因。 */
  notice?: StoreNotice
  /** 深链接指向存在但未开通线上点单的门店：进入空态页而非静默回落。 */
  blockedStore?: Store
}

export function resolveInitialStore(): InitialStoreResolution {
  let storeParam: string | null = null
  try {
    storeParam = new URLSearchParams(window.location.search).get('store')
  } catch {
    // 非浏览器环境忽略深链接
  }

  if (storeParam) {
    const linked = getStore(storeParam)
    if (!linked) return { storeId: DEFAULT_STORE_ID, notice: 'invalid' }
    if (!linked.orderingEnabled) return { storeId: DEFAULT_STORE_ID, blockedStore: linked }
    if (linked.status === 'closed') return { storeId: DEFAULT_STORE_ID, notice: 'closed' }
    return { storeId: linked.id }
  }

  const rememberedId = getRememberedStoreId()
  if (rememberedId) {
    const remembered = getStore(rememberedId)
    if (remembered && isStoreSelectable(remembered)) return { storeId: remembered.id }
    if (remembered && !remembered.orderingEnabled) return { storeId: DEFAULT_STORE_ID, notice: 'unavailable' }
    if (remembered && remembered.status === 'closed') return { storeId: DEFAULT_STORE_ID, notice: 'closed' }
    return { storeId: DEFAULT_STORE_ID, notice: 'invalid' }
  }

  return { storeId: DEFAULT_STORE_ID }
}

// ---- 定位距离 ----

export function distanceMetersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

// ---- 数据访问：正式产品替换点 ----
// 正式实现：const res = await fetch(`/api/stores?lat=${lat}&lng=${lng}&city=${city}&keyword=${keyword}`)
//           return (await res.json()) as Store[]
// ?storesApi=fail 为 demo 内置的失败模拟，用于验收列表加载失败/重试异常态。

const FAIL_CONSUMED_KEY = 'storesApiFailConsumed'

export function listStores(): Promise<Store[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // ?storesApi=fail：首次请求失败（展示错误态+重试），同会话内重试恢复
        const failRequested = new URLSearchParams(window.location.search).get('storesApi') === 'fail'
        let consumed = false
        try {
          consumed = sessionStorage.getItem(FAIL_CONSUMED_KEY) === '1'
          if (failRequested && !consumed) sessionStorage.setItem(FAIL_CONSUMED_KEY, '1')
        } catch {
          // sessionStorage 不可用时不阻断列表加载
        }
        if (failRequested && !consumed) {
          reject(new Error('failed to load stores'))
          return
        }
        resolve(STORES.map((store) => ({ ...store, tables: [...store.tables] })))
      } catch (error) {
        reject(error)
      }
    }, 200)
  })
}
