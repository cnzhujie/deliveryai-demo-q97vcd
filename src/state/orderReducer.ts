import i18next from 'i18next'
import { uid } from '@/lib/utils'
import { DEFAULT_STORE_ID, defaultStore, getStore, isStoreSelectable, storeHasTable } from '@/data/stores'
import type { AppAction, AppState } from '@/types'

export const initialState: AppState = {
  view: 'home',
  currentStoreId: DEFAULT_STORE_ID,
  table: null,
  diners: ['姚乾', '林溪', '陈默'],
  cart: [],
  orderItems: [],
  orderStage: 'submitted',
  soldOut: defaultStore().soldOut,
  services: [],
  paid: false,
  lastMessage: i18next.t('message.welcome'),
}

const stageMessages: Record<string, string> = {
  submitted: 'message.stage_submitted',
  accepted: 'message.stage_accepted',
  cooking: 'message.stage_cooking',
  served: 'message.stage_served',
}

const localeForLanguage = (lang: string) => (lang === 'en' ? 'en-US' : 'zh-CN')

export function orderReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'BIND_TABLE': {
      // 桌台门店隔离：只能绑定当前门店的桌台，异店桌码提示重新扫码
      const store = getStore(state.currentStoreId)
      if (!store || !storeHasTable(store, action.table)) {
        return { ...state, lastMessage: i18next.t('message.store_table_mismatch') }
      }
      return { ...state, table: action.table, view: 'welcome', lastMessage: i18next.t('message.bind_table', { table: action.table }) }
    }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'ADD_CART': {
      const same = state.cart.find((item) => item.productId === action.item.productId && item.spec === action.item.spec && item.orderedBy === action.item.orderedBy)
      const cart = same
        ? state.cart.map((item) => item.uid === same.uid ? { ...item, quantity: item.quantity + 1 } : item)
        : [...state.cart, action.item]
      return { ...state, cart, lastMessage: i18next.t('message.add_cart', { name: action.item.orderedBy, dish: action.item.name }) }
    }
    case 'CHANGE_QTY': {
      const cart = state.cart
        .map((item) => item.uid === action.uid ? { ...item, quantity: item.quantity + action.delta } : item)
        .filter((item) => item.quantity > 0)
      return { ...state, cart }
    }
    case 'SUBMIT_ORDER': {
      if (!state.cart.length) return state
      const additions = state.cart.map((item) => ({ ...item, stage: 'submitted' as const }))
      return {
        ...state,
        orderItems: [...state.orderItems, ...additions],
        cart: [],
        orderStage: 'submitted',
        view: 'order',
        lastMessage: state.orderItems.length ? i18next.t('message.order_additional') : i18next.t('message.order_submitted'),
      }
    }
    case 'SET_STAGE':
      return {
        ...state,
        orderStage: action.stage,
        orderItems: state.orderItems.map((item) => ({ ...item, stage: action.stage })),
        lastMessage: i18next.t(stageMessages[action.stage]),
      }
    case 'TOGGLE_SOLD_OUT':
      return {
        ...state,
        soldOut: state.soldOut.includes(action.productId)
          ? state.soldOut.filter((id) => id !== action.productId)
          : [...state.soldOut, action.productId],
        lastMessage: i18next.t('message.soldout_updated'),
      }
    case 'CALL_SERVICE': {
      const serviceName = i18next.t(`${action.service}.name`)
      return {
        ...state,
        services: [...state.services, { id: uid(), type: serviceName, createdAt: new Date().toLocaleTimeString(localeForLanguage(i18next.language), { hour: '2-digit', minute: '2-digit' }), status: 'waiting' }],
        lastMessage: i18next.t('message.service_called', { service: serviceName }),
      }
    }
    case 'RESPOND_SERVICES':
      return { ...state, services: state.services.map((service) => ({ ...service, status: 'responded' })), lastMessage: i18next.t('message.service_responded') }
    case 'REQUEST_CANCEL':
      return {
        ...state,
        orderItems: state.orderItems.map((item) => item.uid === action.uid ? { ...item, cancelState: 'requested' } : item),
        lastMessage: i18next.t('message.cancel_requested'),
      }
    case 'PAY':
      return { ...state, paid: true, lastMessage: i18next.t('message.paid') }
    case 'RESET':
      // 重置的是门店会话级状态；当前门店是设备偏好，保持不变
      return {
        ...initialState,
        currentStoreId: state.currentStoreId,
        soldOut: getStore(state.currentStoreId)?.soldOut ?? initialState.soldOut,
        lastMessage: i18next.t('message.reset'),
      }
    case 'SWITCH_STORE': {
      const store = getStore(action.storeId)
      if (!store || !isStoreSelectable(store)) {
        return { ...state, lastMessage: i18next.t('message.store_switch_failed') }
      }
      // 清空门店会话级状态（桌台/购物车/订单/服务/沽清/支付/协同人），回到 home 重新绑桌；
      // 语言、老人模式属设备偏好，不在该 state 内，天然保留。
      return {
        ...initialState,
        currentStoreId: store.id,
        soldOut: store.soldOut,
        view: 'home',
        table: null,
        lastMessage: i18next.t('message.store_switched', { name: i18next.t(store.nameKey) }),
      }
    }
    case 'SET_MESSAGE':
      return { ...state, lastMessage: action.message }
    default:
      return state
  }
}
