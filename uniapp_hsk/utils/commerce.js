import request from '@/utils/request.js'

export function resumeLogin() {
  const pages = getCurrentPages(), page = pages[pages.length - 1]
  const query = Object.entries(page.options || {}).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&')
  uni.setStorageSync('commerceReturnPath', '/' + page.route + (query ? '?' + query : ''))
  uni.navigateTo({ url:'/pages/login/login' })
}
export function requireLogin() { if (uni.getStorageSync('token')) return true; resumeLogin(); return false }
export function commerce(path, data = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    uni.request({ url:request.baseURL + path, data, method, timeout:20000,
      header:{ 'Content-Type':'application/json', 'X-App-Code':request.appCode || request.header['X-App-Code'], Authorization:uni.getStorageSync('token') || '' },
      success:res => {
        if (res.statusCode === 200 && res.data.code === 200) return resolve(res.data.data)
        if (res.data?.code === 401) { uni.removeStorageSync('token'); resumeLogin() }
        reject(new Error(res.data?.msg || '请求失败，请重试'))
      }, fail:() => reject(new Error('网络异常，请重试'))
    })
  })
}
export const stateText = state => ({collecting:'报名中',expired:'报名已截止',locked:'待团长付款',paying:'正在核对付款',paid:'团长已付款',cancelled:'已取消',registered:'已报名',unpaid:'待团长付款',ready:'待发货',shipped:'已发货',received:'已收货',refunded:'已退款',requested:'退款待审批',processing:'退款处理中',succeeded:'退款成功',failed:'退款失败',rejected:'退款申请已拒绝'}[state] || state)
export function showError(error) { uni.showToast({ title:error.message || '操作失败', icon:'none' }) }
export function localTime(seconds) { const d=new Date(seconds*1000); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
