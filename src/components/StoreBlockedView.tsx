import { useTranslation } from 'react-i18next'
import { Ban, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Store as StoreType } from '@/data/stores'

interface StoreBlockedViewProps {
  store: StoreType
  onSelectOther: () => void
}

export function StoreBlockedView({ store, onSelectOther }: StoreBlockedViewProps) {
  const { t } = useTranslation()
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rice-100 paper-noise px-5">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-chili-100 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
      <section className="relative w-full max-w-md animate-rise rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-float backdrop-blur">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-chili-50 text-chili-500"><Ban size={32} /></span>
        <h1 className="mt-5 text-2xl font-extrabold text-charcoal-900">{t('store.blocked_title')}</h1>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-charcoal-500"><Store size={15} className="text-chili-500" />{t(store.nameKey)}</p>
        <p className="mt-3 text-sm leading-6 text-charcoal-500">{t('store.blocked_desc')}</p>
        <Button onClick={onSelectOther} className="mt-6 w-full">{t('store.select_other')}</Button>
      </section>
    </main>
  )
}
