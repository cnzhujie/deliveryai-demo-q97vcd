import { useTranslation } from 'react-i18next'
import { AlertTriangle, Ban, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { SwitchGuardKind } from '@/state/storeGuard'

interface StoreGuardDialogProps {
  kind: Exclude<SwitchGuardKind, 'allow'> | null
  onCancel: () => void
  onConfirm: () => void
  onCheckout: () => void
}

export function StoreGuardDialog({ kind, onCancel, onConfirm, onCheckout }: StoreGuardDialogProps) {
  const { t } = useTranslation()
  const blocked = kind === 'blockedUnpaid'
  const paid = kind === 'confirmPaid'

  const title = blocked ? t('store.guard_unpaid_title') : paid ? t('store.guard_paid_title') : t('store.guard_cart_title')
  const desc = blocked ? t('store.guard_unpaid_desc') : paid ? t('store.guard_paid_desc') : t('store.guard_cart_desc')

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent title={title}>
        <div className="mt-4 flex flex-col items-center gap-4">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${blocked ? 'bg-chili-50 text-chili-500' : 'bg-amber-100 text-amber-500'}`}>
            {blocked ? <Ban size={28} /> : <AlertTriangle size={28} />}
          </span>
          <p className="text-center text-sm leading-6 text-charcoal-700">{desc}</p>
          {blocked ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={onCancel}><HelpCircle size={16} />{t('store.guard_gotit')}</Button>
              <Button className="flex-1" onClick={onCheckout}>{t('store.go_checkout')}</Button>
            </div>
          ) : (
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>{t('store.guard_cancel')}</Button>
              <Button className="flex-1" onClick={onConfirm}>{t('store.guard_confirm')}</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
