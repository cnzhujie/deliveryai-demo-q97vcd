import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronRight, MapPin, QrCode, Sparkles, Users } from 'lucide-react'
import hotpot from '@/assets/hotpot.jpg'
import { Button } from '@/components/ui/button'
import type { Store } from '@/data/stores'

interface HomeViewProps {
  store: Store
  onBind: (table: string) => void
  onOpenStorePicker: () => void
}

export function HomeView({ store, onBind, onOpenStorePicker }: HomeViewProps) {
  const { t } = useTranslation()
  const closed = store.status === 'closed'
  return (
    <main className="relative min-h-screen overflow-hidden bg-rice-100 paper-noise">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-chili-100 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:px-10">
        <section className="animate-rise">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-chili-500/20 bg-white/80 px-3 py-2 text-xs font-bold text-chili-600 shadow-sm">
            <Sparkles size={14} /> {t('common.concept_badge')}
          </div>
          <p className="mb-3 text-sm font-bold tracking-widest text-chili-500">{t('common.concept_en')}</p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-charcoal-900 sm:text-5xl lg:text-6xl">
            {t('bind.title_l1')}<br /><span className="text-chili-500">{t('bind.title_l2')}</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-charcoal-500">{t('bind.desc')}</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-charcoal-700">
            {[t('bind.feature1'), t('bind.feature2'), t('bind.feature3')].map((item) => (
              <span key={item} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><Check size={15} className="text-chili-500" />{item}</span>
            ))}
          </div>
        </section>

        <section className="animate-rise rounded-3xl border border-white/80 bg-white/90 p-4 shadow-float backdrop-blur sm:p-6">
          <button
            type="button"
            onClick={onOpenStorePicker}
            aria-label={t('store.card_aria')}
            className="relative mb-6 block h-48 w-full overflow-hidden rounded-2xl text-left sm:h-56"
          >
            <img src={hotpot} alt={t('bind.img_alt')} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-chili-600 shadow-sm backdrop-blur">
              {t('store.switch_hint')}<ChevronDown size={13} />
            </span>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-xl font-bold">{t(store.nameKey)}</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs opacity-90"><MapPin size={12} />{t(store.districtKey)} · {t(store.addressKey)}</p>
            </div>
            <span className={`absolute bottom-4 right-4 rounded-full px-3 py-1 text-xs backdrop-blur ${closed ? 'bg-charcoal-900/50 text-white' : 'bg-white/20 text-white'}`}>
              {closed ? t('store.status_closed') : t('store.status_open')}
            </span>
          </button>
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-rice-100 p-4">
            <span className="rounded-xl bg-white p-3 text-chili-500 shadow-sm"><QrCode /></span>
            <div className="min-w-0 flex-1"><p className="font-bold text-charcoal-900">{t('bind.qr_title')}</p><p className="text-sm text-charcoal-500">{t('bind.qr_desc')}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {store.tables.map(({ code, areaKey, seats }, index) => (
              <button key={code} onClick={() => onBind(code)} className="group rounded-2xl border border-charcoal-900/10 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-chili-500 hover:shadow-card">
                <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rice-100 text-sm font-extrabold text-chili-500">{index + 1}</span>
                <p className="font-bold text-charcoal-900">{code} · {t(areaKey)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-500"><Users size={13} /> {t('bind.seats', { count: seats })}</p>
                <ChevronRight size={17} className="ml-auto mt-2 text-charcoal-500 transition group-hover:translate-x-1 group-hover:text-chili-500" />
              </button>
            ))}
          </div>
          <Button onClick={() => onBind(store.tables[0].code)} className="mt-4 w-full"><MapPin size={17} />{t('bind.quick_enter', { table: store.tables[0].code })}</Button>
        </section>
      </div>
    </main>
  )
}
