import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Clock3, Loader2, LocateFixed, MapPin, RefreshCw, Search, Store as StoreIcon, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { distanceMetersBetween, listStores, listVisibleStores } from '@/data/stores'
import type { Store } from '@/data/stores'

interface StorePickerProps {
  open: boolean
  currentStoreId: string
  onOpenChange: (open: boolean) => void
  onSelect: (store: Store) => void
  onNotice: (message: string) => void
}

export function StorePicker({ open, currentStoreId, onOpenChange, onSelect, onNotice }: StorePickerProps) {
  const { t } = useTranslation()
  const [stores, setStores] = useState<Store[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [hint, setHint] = useState('')
  const [locating, setLocating] = useState(false)
  const [distances, setDistances] = useState<Record<string, number> | null>(null)
  // 单飞闸门：StrictMode 开发态 effect 双调用时只发一次列表请求
  const inflightRef = useRef(false)

  const load = useCallback(async () => {
    if (inflightRef.current) return
    inflightRef.current = true
    setLoading(true)
    setFailed(false)
    try {
      setStores(await listStores())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
      inflightRef.current = false
    }
  }, [])

  useEffect(() => {
    // 仅在首次打开时自动加载；失败后由「重试」按钮显式触发，避免 loading 回落自动重发
    if (open && stores === null && !failed && !inflightRef.current) void load()
  }, [open, stores, failed, load])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHint('')
    }
  }, [open])

  const visibleStores = useMemo(() => {
    if (!stores) return []
    const keyword = query.trim().toLowerCase()
    return listVisibleStores(stores)
      .filter((store) => {
        if (!keyword) return true
        return [t(store.nameKey), t(store.districtKey), t(store.addressKey)]
          .some((value) => value.toLowerCase().includes(keyword))
      })
      .sort((a, b) => {
        if ((a.status === 'closed') !== (b.status === 'closed')) return a.status === 'closed' ? 1 : -1
        if (distances) return (distances[a.id] ?? Number.POSITIVE_INFINITY) - (distances[b.id] ?? Number.POSITIVE_INFINITY)
        return 0
      })
  }, [stores, query, distances, t])

  const handleLocate = () => {
    if (locating) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onNotice(t('store.location_unsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: Record<string, number> = {}
        for (const store of stores ?? []) {
          if (store.location) {
            next[store.id] = distanceMetersBetween(
              { lat: position.coords.latitude, lng: position.coords.longitude },
              store.location,
            )
          }
        }
        setDistances(next)
        setLocating(false)
      },
      () => {
        setLocating(false)
        onNotice(t('store.location_denied'))
      },
      { timeout: 8000, maximumAge: 300000 },
    )
  }

  const formatDistance = (meters: number): string => (
    meters >= 1000 ? t('store.distance_km', { value: (meters / 1000).toFixed(1) }) : t('store.distance_m', { value: meters })
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('store.selector_title')} className="md:max-w-xl">
        <p className="mt-2 text-sm text-charcoal-500">{t('store.selector_desc')}</p>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-500" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('store.search_placeholder')}
              aria-label={t('store.search_placeholder')}
              className="h-12 w-full rounded-2xl border border-charcoal-900/5 bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-chili-500/30 focus:ring-4 focus:ring-chili-50"
            />
          </div>
          <Button variant="outline" onClick={handleLocate} disabled={loading || failed || locating} aria-label={t('store.nearby')}>
            {locating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
            <span className="hidden sm:inline">{locating ? t('store.locating') : t('store.nearby')}</span>
          </Button>
        </div>

        {hint && <p className="mt-3 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-charcoal-700">{hint}</p>}

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-charcoal-500">
              <Loader2 size={18} className="animate-spin" />{t('store.loading')}
            </div>
          )}

          {failed && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <XCircle size={32} className="text-chili-500" />
              <p className="text-sm font-semibold text-charcoal-700">{t('store.load_error')}</p>
              <Button variant="secondary" onClick={() => void load()}><RefreshCw size={16} />{t('store.retry')}</Button>
            </div>
          )}

          {!loading && !failed && stores && visibleStores.length === 0 && (
            <p className="py-12 text-center text-sm text-charcoal-500">{t('store.empty_result')}</p>
          )}

          {!loading && !failed && visibleStores.map((store) => {
            const closed = store.status === 'closed'
            const current = store.id === currentStoreId
            const distance = distances?.[store.id]
            return (
              <button
                key={store.id}
                type="button"
                data-testid="store-row"
                data-store-id={store.id}
                aria-disabled={closed}
                aria-current={current || undefined}
                onClick={() => {
                  if (closed) {
                    setHint(t('store.closed_hint', { hours: store.hours }))
                    return
                  }
                  onSelect(store)
                }}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  closed
                    ? 'cursor-not-allowed border-charcoal-900/5 bg-rice-100 text-charcoal-500'
                    : 'border-charcoal-900/5 bg-white shadow-sm hover:-translate-y-0.5 hover:border-chili-500/30 hover:shadow-card'
                }`}
              >
                <span className={`mt-0.5 rounded-xl p-2.5 ${closed ? 'bg-rice-200 text-charcoal-500' : 'bg-chili-50 text-chili-500'}`}><StoreIcon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate font-bold ${closed ? 'text-charcoal-500' : 'text-charcoal-900'}`}>{t(store.nameKey)}</span>
                    {current && <span className="shrink-0 rounded-full bg-chili-50 px-2 py-0.5 text-[11px] font-bold text-chili-600">{t('store.current_tag')}</span>}
                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${closed ? 'bg-rice-200 text-charcoal-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      {closed ? t('store.status_closed') : t('store.status_open')}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-charcoal-500"><MapPin size={12} className="shrink-0" /><span className="truncate">{t(store.districtKey)} · {t(store.addressKey)}</span></span>
                  <span className="mt-1.5 flex items-center gap-3 text-xs text-charcoal-500">
                    <span className="flex items-center gap-1"><Clock3 size={12} />{t('store.hours_label', { hours: store.hours })}</span>
                    {distance != null && <span className="font-semibold text-chili-600">{formatDistance(distance)}</span>}
                  </span>
                </span>
                {!closed && current && <Check size={18} className="mt-1 shrink-0 text-chili-500" aria-label={t('store.check_aria')} />}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
