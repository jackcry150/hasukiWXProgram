// HSK 微信客服公开接入参数，由企业微信管理员提供。
export const customerServiceConfig = Object.freeze({
  corpId: 'ww26b2bb0964be8f1d',
  url: 'https://work.weixin.qq.com/kfid/kfc3e143acfbff56a9a'
})

let opening = false

export function openCustomerService() {
  if (opening) return
  if (typeof wx === 'undefined' || typeof wx.openCustomerServiceChat !== 'function') {
    uni.showToast({ title: '请在微信中打开小程序联系客服', icon: 'none' })
    return
  }
  opening = true
  const fail = (error) => {
    if (/cancel/i.test((error && error.errMsg) || '')) return
    uni.showToast({ title: '客服暂时无法打开，请稍后重试', icon: 'none' })
    console.warn('HSK customer service:', error)
  }
  try {
    wx.openCustomerServiceChat({
      corpId: customerServiceConfig.corpId,
      extInfo: { url: customerServiceConfig.url },
      fail,
      complete: () => { opening = false }
    })
  } catch (error) {
    opening = false
    fail(error)
  }
}
