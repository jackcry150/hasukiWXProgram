export const DEFAULT_ARRIVAL_REJECT_TIP = '您尚未开启到货通知，可能无法收到商品到货提醒。请留意“我的订单”，及时查看到货及尾款信息。'
const TEMPLATE_ID = 'pfnB_QMu5dQQ212rm7XWmpI_aad4xCvrLSMGjReKssU'
const handled = new Set()
let active = false

export function askArrivalSubscribe(userId, loadSettings) {
  if (!userId || !uni.getStorageSync('token') || active) return
  const key = `arrival_subscribe_asked_v3:hasuki:${TEMPLATE_ID}:${userId}`
  // Subscription decisions belong to this template and account.
  if (handled.has(key) || uni.getStorageSync(key)) return
  active = true
  const settings = Promise.resolve().then(loadSettings).catch(() => null)
  const remember = () => {
    handled.add(key)
    try { uni.setStorageSync(key, 1) } catch (_) { /* Session guard still prevents repeats. */ }
  }
  const finish = () => { active = false }
  const warn = async () => {
    remember()
    const response = await settings
    const value = response && response.code === 200 && response.data && response.data.arrivalRejectTip
    const content = typeof value === 'string' ? value.trim() : DEFAULT_ARRIVAL_REJECT_TIP
    if (!content) { finish(); return }
    uni.showModal({ title: '到货通知提醒', content, showCancel: false, confirmText: '知道了', complete: finish })
  }
  uni.showModal({
    title: '到货通知', content: '是否开启到货后通知？', confirmText: '开启', cancelText: '拒绝',
    success: res => {
      if (res.cancel) { warn(); return }
      if (!res.confirm) { finish(); return }
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: ret => {
          const status = ret[TEMPLATE_ID]
          if (status === 'reject' || status === 'ban') { warn(); return }
          if (status === 'accept') {
            remember()
            uni.showToast({ title: '已开启通知', icon: 'none' })
          }
          finish()
        },
        fail: () => { finish(); uni.showToast({ title: '订阅调用失败', icon: 'none' }) }
      })
    },
    fail: finish
  })
}
