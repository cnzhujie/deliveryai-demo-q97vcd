import type { AppState } from '@/types'

/**
 * 切换门店前的会话状态校验（方案第四节四类 guard）。
 * - allow：未绑桌或空会话，直接切换
 * - confirmCart：购物车有未下单菜品 / 有等待中的服务呼叫，二次确认
 * - blockedUnpaid：有订单未支付，禁止切换
 * - confirmPaid：已支付，二次确认后允许切换
 */
export type SwitchGuardKind = 'allow' | 'confirmCart' | 'blockedUnpaid' | 'confirmPaid'

export function evaluateSwitchGuard(state: AppState): SwitchGuardKind {
  const hasWaitingService = state.services.some((service) => service.status === 'waiting')
  if (state.orderItems.length > 0 && !state.paid) return 'blockedUnpaid'
  if (state.paid) return 'confirmPaid'
  if (state.cart.length > 0 || hasWaitingService) return 'confirmCart'
  return 'allow'
}
