import { useCallback, useEffect, useReducer, useState } from 'react'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { ClipboardList, ConciergeBell, LayoutDashboard, Menu as MenuIcon, ShoppingBasket } from 'lucide-react'
import { HomeView } from '@/components/HomeView'
import { WelcomeView } from '@/components/WelcomeView'
import { CartPanel } from '@/components/CartPanel'
import { CheckoutView } from '@/components/CheckoutView'
import { DemoConsole } from '@/components/DemoConsole'
import { MenuView } from '@/components/MenuView'
import { OrderView } from '@/components/OrderView'
import { ServiceSheet } from '@/components/ServiceSheet'
import { StorePicker } from '@/components/StorePicker'
import { StoreGuardDialog } from '@/components/StoreGuardDialog'
import { StoreBlockedView } from '@/components/StoreBlockedView'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useElderlyMode } from '@/hooks/useElderlyMode'
import { initialViewFromHash, useViewRoute } from '@/hooks/useViewRoute'
import { orderReducer, initialState } from '@/state/orderReducer'
import { evaluateSwitchGuard, type SwitchGuardKind } from '@/state/storeGuard'
import { products } from '@/data/menu'
import {
  defaultStore,
  getStore,
  isStoreSelectable,
  rememberStore,
  resolveInitialStore,
  storeHasTable,
  type InitialStoreResolution,
  type Store,
} from '@/data/stores'
import { money } from '@/lib/utils'
import type { AppState, ViewName } from '@/types'

function createInitialState(resolution: InitialStoreResolution): AppState {
  const search = new URLSearchParams(window.location.search)
  const requestedView = initialViewFromHash()
  const resolvedStore = getStore(resolution.storeId) ?? defaultStore()

  const base: AppState = {
    ...initialState,
    currentStoreId: resolvedStore.id,
    soldOut: resolvedStore.soldOut,
  }
  if (resolution.notice) {
    base.lastMessage = i18next.t(`message.store_${resolution.notice}`)
  }

  // preview=menu：预置一桌带购物车的点餐态，供设计/截图预览（固定使用默认店 A08）
  if (search.get('preview') === 'menu') {
    const product = products[2]
    const spec = [i18next.t('menu.option.full'), i18next.t('menu.option.original')].join(' · ')
    const previewStore = defaultStore()
    return {
      ...base,
      currentStoreId: previewStore.id,
      soldOut: previewStore.soldOut,
      table: 'A08',
      view: 'menu',
      cart: [{ uid: 'preview-item', productId: product.id, name: i18next.t(product.name), price: product.price, quantity: 1, image: product.image, spec, orderedBy: '姚乾' }],
      lastMessage: initialState.lastMessage,
    }
  }

  // 深链接：直接以 #/welcome 等地址打开时，先绑定示例桌台再进入对应视图；
  // 示例桌台不属于当前门店时，停在首页并提示桌台与门店不匹配。
  if (requestedView && requestedView !== 'home') {
    if (storeHasTable(resolvedStore, 'A08')) {
      return { ...base, table: 'A08', view: requestedView }
    }
    return { ...base, view: 'home', lastMessage: i18next.t('message.store_table_mismatch') }
  }

  return base
}

type PendingGuard = { kind: Exclude<SwitchGuardKind, 'allow'>; target: Store }

export default function App() {
  const { t, i18n } = useTranslation()
  const [resolution] = useState(resolveInitialStore)
  const [state, dispatch] = useReducer(orderReducer, resolution, createInitialState)
  const { enabled: elderly, toggle: toggleElderly } = useElderlyMode()
  const [blockedStore, setBlockedStore] = useState<Store | null>(resolution.blockedStore ?? null)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingGuard, setPendingGuard] = useState<PendingGuard | null>(null)
  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const waitingServices = state.services.filter((service) => service.status === 'waiting').length
  const currentStore = getStore(state.currentStoreId) ?? defaultStore()
  const storeName = t(currentStore.nameKey)

  // 视图 ↔ URL hash 双向同步；未绑定桌台时只有 home 可达，其余地址回落到 home
  const canView = useCallback((view: ViewName) => view === 'home' || !!state.table, [state.table])
  const navigate = useCallback((view: ViewName) => dispatch({ type: 'SET_VIEW', view }), [])
  useViewRoute(state.view, { onNavigate: navigate, canView })

  useEffect(() => {
    document.documentElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en'
    document.title = t('common.title')
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', t('common.meta_desc'))
    try {
      localStorage.setItem('i18nextLng', i18n.language)
    } catch {
      // localStorage 不可用时降级为内存态，不报错不阻塞
    }
  }, [i18n.language, t])

  const changeView = (view: ViewName) => dispatch({ type: 'SET_VIEW', view })
  const submitOrder = () => {
    dispatch({ type: 'SUBMIT_ORDER' })
    setCartOpen(false)
  }
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  }
  const handleToggleElderly = () => {
    toggleElderly()
    dispatch({ type: 'SET_MESSAGE', message: elderly ? '已切换为常规模式' : '已切换为老人模式' })
  }

  const commitSwitch = (store: Store) => {
    rememberStore(store.id)
    dispatch({ type: 'SWITCH_STORE', storeId: store.id })
    setPickerOpen(false)
    setPendingGuard(null)
    setBlockedStore(null)
  }

  const handleSelectStore = (store: Store) => {
    if (store.id === state.currentStoreId) {
      setPickerOpen(false)
      setBlockedStore(null)
      return
    }
    // 打开列表后门店状态可能已变化：点击时按最新状态阻止切换
    if (!isStoreSelectable(store)) {
      dispatch({ type: 'SET_MESSAGE', message: store.status === 'closed' ? t('store.closed_hint', { hours: store.hours }) : t('store.changed_hint') })
      return
    }
    const kind = evaluateSwitchGuard(state)
    if (kind === 'allow') {
      commitSwitch(store)
      return
    }
    setPickerOpen(false)
    setPendingGuard({ kind, target: store })
  }

  // 确认切换：执行时按最新会话状态二次校验，不满足 guard 则终止并提示最新原因
  const handleGuardConfirm = () => {
    if (!pendingGuard) return
    const latest = evaluateSwitchGuard(state)
    if (latest === 'blockedUnpaid') {
      setPendingGuard({ kind: 'blockedUnpaid', target: pendingGuard.target })
      return
    }
    commitSwitch(pendingGuard.target)
  }

  const storeLayer = (
    <>
      <StorePicker
        open={pickerOpen}
        currentStoreId={state.currentStoreId}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectStore}
        onNotice={(message) => dispatch({ type: 'SET_MESSAGE', message })}
      />
      <StoreGuardDialog
        kind={pendingGuard?.kind ?? null}
        onCancel={() => setPendingGuard(null)}
        onConfirm={handleGuardConfirm}
        onCheckout={() => { setPendingGuard(null); changeView('checkout') }}
      />
    </>
  )

  if (blockedStore) {
    return (
      <>
        <StoreBlockedView store={blockedStore} onSelectOther={() => setPickerOpen(true)} />
        {storeLayer}
      </>
    )
  }

  if (state.view === 'home' || !state.table) {
    return (
      <>
        <HomeView store={currentStore} onBind={(table) => dispatch({ type: 'BIND_TABLE', table })} onOpenStorePicker={() => setPickerOpen(true)} />
        {storeLayer}
        <Toast message={state.lastMessage} />
      </>
    )
  }

  if (state.view === 'welcome') {
    return <WelcomeView storeName={storeName} table={state.table!} onEnter={() => dispatch({ type: 'SET_VIEW', view: 'menu' })} />
  }

  return (
    <div className="min-h-screen bg-rice-100 paper-noise">
      <TopBar
        storeName={storeName}
        table={state.table}
        view={state.view}
        serviceCount={waitingServices}
        language={i18n.language}
        elderly={elderly}
        onToggleLanguage={toggleLanguage}
        onToggleElderly={handleToggleElderly}
        onView={changeView}
        onService={() => setServiceOpen(true)}
        onConsole={() => setConsoleOpen(true)}
        onSwitchStore={() => setPickerOpen(true)}
      />

      {state.view === 'menu' && (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 pb-28 lg:grid-cols-3 lg:px-6 lg:py-7 lg:pb-8">
          <div className="lg:col-span-2">
            <MenuView diners={state.diners} soldOut={state.soldOut} onAdd={(item) => dispatch({ type: 'ADD_CART', item })} />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <CartPanel items={state.cart} onQuantity={(uid, delta) => dispatch({ type: 'CHANGE_QTY', uid, delta })} onSubmit={submitOrder} />
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-100/70 p-4 text-sm text-charcoal-700">
                <p className="font-bold">{t('common.collab_title')}</p>
                <p className="mt-1 leading-6 text-charcoal-500">{t('common.collab_desc')}</p>
              </div>
            </div>
          </aside>
        </main>
      )}

      {state.view === 'order' && (
        <OrderView
          items={state.orderItems}
          stage={state.orderStage}
          onAddMore={() => changeView('menu')}
          onCancel={(uid) => dispatch({ type: 'REQUEST_CANCEL', uid })}
          onCheckout={() => changeView('checkout')}
        />
      )}

      {state.view === 'checkout' && (
        <CheckoutView items={state.orderItems} paid={state.paid} onPay={() => dispatch({ type: 'PAY' })} onBack={() => changeView('order')} />
      )}

      <ServiceSheet open={serviceOpen} requests={state.services} onOpenChange={setServiceOpen} onCall={(service) => dispatch({ type: 'CALL_SERVICE', service })} />
      <DemoConsole
        open={consoleOpen}
        table={state.table}
        stage={state.orderStage}
        soldOut={state.soldOut}
        services={state.services}
        onOpenChange={setConsoleOpen}
        onStage={(stage) => dispatch({ type: 'SET_STAGE', stage })}
        onSoldOut={(productId) => dispatch({ type: 'TOGGLE_SOLD_OUT', productId })}
        onRespond={() => dispatch({ type: 'RESPOND_SERVICES' })}
        onReset={() => { dispatch({ type: 'RESET' }); setConsoleOpen(false) }}
      />

      {storeLayer}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent title={t('cart.dialog_title')}>
          <div className="mt-5"><CartPanel compact items={state.cart} onQuantity={(uid, delta) => dispatch({ type: 'CHANGE_QTY', uid, delta })} onSubmit={submitOrder} /></div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 lg:hidden">
        {state.view === 'menu' && state.cart.length > 0 && (
          <Button onClick={() => setCartOpen(true)} className="h-12 rounded-full px-5 shadow-float">
            <span className="relative"><ShoppingBasket size={19} /><span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-xs text-charcoal-900">{state.cart.length}</span></span>
            {t('common.view_cart')} · {money(cartTotal)}
          </Button>
        )}
      </div>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-charcoal-900/5 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
        <MobileNav active={state.view === 'menu'} icon={MenuIcon} label={t('common.nav_menu')} onClick={() => changeView('menu')} />
        <MobileNav active={state.view === 'order'} icon={ClipboardList} label={t('common.nav_order')} onClick={() => changeView('order')} />
        <MobileNav active={serviceOpen} icon={ConciergeBell} label={t('common.nav_service')} badge={waitingServices} onClick={() => setServiceOpen(true)} />
        <MobileNav active={consoleOpen} icon={LayoutDashboard} label={t('common.nav_demo')} onClick={() => setConsoleOpen(true)} />
      </nav>

      <Toast message={state.lastMessage} />
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2 rounded-full bg-charcoal-900/90 px-4 py-2 text-xs font-semibold text-white shadow-float">
      {message}
    </div>
  )
}

function MobileNav({ active, icon: Icon, label, badge, onClick }: { active: boolean; icon: typeof MenuIcon; label: string; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition ${active ? 'bg-chili-50 text-chili-500' : 'text-charcoal-500'}`}>
      <Icon size={20} />{label}{badge ? <span className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-chili-500 px-1 text-white">{badge}</span> : null}
    </button>
  )
}
