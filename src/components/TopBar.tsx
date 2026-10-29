import { Accessibility, ChevronDown, Crown, Languages, LayoutDashboard, MapPin, PhoneCall, ReceiptText, Search, Store, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { tableAreas } from '@/data/menu'
import type { ViewName } from '@/types'

interface TopBarProps {
  storeName: string
  table: string
  view: ViewName
  serviceCount: number
  language: string
  elderly: boolean
  onToggleLanguage: () => void
  onToggleElderly: () => void
  onView: (view: ViewName) => void
  onService: () => void
  onConsole: () => void
  onSwitchStore: () => void
}

export function TopBar({ storeName, table, view, serviceCount, language, elderly, onToggleLanguage, onToggleElderly, onView, onService, onConsole, onSwitchStore }: TopBarProps) {
  const { t } = useTranslation()
  const areaKey = tableAreas[table]
  const tableLabel = areaKey ? `${table} · ${t(areaKey)}` : table

  return (
    <>
      <div className="bg-charcoal-900 px-4 py-2 text-center text-xs font-semibold tracking-wide text-rice-100">
        {t('common.banner')}
      </div>
      <header className="sticky top-0 z-30 border-b border-charcoal-900/5 bg-rice-50/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 lg:gap-3 lg:px-6">
          <button onClick={() => onView('menu')} className="flex shrink-0 items-center gap-2 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-chili-500 text-lg font-black text-white shadow-md">{t('common.brand')}</span>
            <span className="hidden sm:block"><strong className="block leading-4 text-charcoal-900">{t('common.brand_name')}</strong><small className="text-charcoal-500">{t('common.subtitle')}</small></span>
          </button>
          <button
            onClick={onSwitchStore}
            aria-label={t('store.topbar_aria', { name: storeName })}
            className="flex min-w-0 items-center gap-1 rounded-full bg-chili-50 px-2.5 py-2 text-xs font-bold text-chili-600 transition hover:bg-chili-100 lg:px-3"
          >
            <Store size={13} className="shrink-0" /><span className="max-w-[5.5rem] truncate sm:max-w-[9rem] lg:max-w-[13rem]">{storeName}</span><ChevronDown size={12} className="shrink-0" />
          </button>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-rice-200 px-3 py-2 text-xs font-bold text-charcoal-700"><MapPin size={13} className="text-chili-500" />{tableLabel}</span>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <Button variant={view === 'menu' ? 'secondary' : 'ghost'} size="sm" onClick={() => onView('menu')}><Search size={16} />{t('common.nav_menu')}</Button>
            <Button variant={view === 'order' ? 'secondary' : 'ghost'} size="sm" onClick={() => onView('order')}><ReceiptText size={16} />{t('common.nav_order')}</Button>
          </nav>
          <Button variant="outline" size="icon" onClick={onService} className="relative" aria-label={t('common.aria_service')}>
            <PhoneCall size={18} />{serviceCount > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-chili-500" />}
          </Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="icon" aria-label={t('common.aria_member')}><UserRound size={18} /></Button></DialogTrigger>
            <DialogContent title={t('common.member_title')}>
              <div className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-700 p-5 text-white shadow-card">
                <div className="flex items-start justify-between"><span className="rounded-xl bg-amber-400 p-2 text-charcoal-900"><Crown /></span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{t('common.member_badge')}</span></div>
                <p className="mt-6 text-sm text-rice-200">{t('common.member_name')}</p><p className="mt-1 text-2xl font-bold">2,680 <small className="text-sm font-medium text-rice-200">{t('common.growth_value')}</small></p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-charcoal-500">{t('common.queue')}</p><p className="mt-2 text-2xl font-extrabold text-charcoal-900">A018</p><p className="text-xs text-chili-500">{t('common.queue_ahead')}</p></div>
                <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-charcoal-500">{t('common.benefits')}</p><p className="mt-2 text-2xl font-extrabold text-charcoal-900">4 <small className="text-sm">{t('common.tickets')}</small></p><p className="text-xs text-amber-500">{t('common.coupon')}</p></div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={onConsole} aria-label={t('common.aria_console')}><LayoutDashboard size={18} /></Button>
          <Button variant="outline" size="icon" onClick={onToggleElderly} aria-label={elderly ? '切换至常规模式' : '切换至老人模式'}>
            <Accessibility size={18} className={elderly ? 'text-chili-500' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleLanguage} aria-label={t('common.aria_lang')}>
            <Languages size={16} />{language === 'zh' ? 'EN' : '中'}
          </Button>
        </div>
      </header>
    </>
  )
}
