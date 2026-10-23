import { commerce } from '@/utils/commerce.js'

export function balanceReminderStatus(orderId) {
  return commerce('/balance/status', { id: orderId })
}
export async function subscribeBalanceReminder(orderId, state, subscribe = fn => wx.requestSubscribeMessage(fn)) {
  if (!state?.canSubscribe) throw new Error('当前订单无需尾款提醒')
  if (!state.reminderAvailable || !state.templateId) throw new Error('商家正在配置尾款提醒，请留意订单日期')
  const template = state.templateId
  const consent = await new Promise((resolve,reject) => {
    subscribe({ tmplIds:[template], success:result=>resolve(result[template] || 'unknown'), fail:()=>reject(new Error('订阅调用失败，请重试')) })
  })
  if (!['accept','reject','ban'].includes(consent)) throw new Error('未取得订阅结果，请重试')
  const saved = await commerce('/balance/follow', { id:orderId, followed:consent==='accept', consent, template_id:template }, 'POST')
  return { state:saved, accepted:consent==='accept' }
}
