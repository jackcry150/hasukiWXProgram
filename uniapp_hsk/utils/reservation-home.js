import analytics from '@/utils/analytics.js'
import { commerce, requireLogin, showError } from '@/utils/commerce.js'

export default {
  data() { return { homeReservationState: {}, homeReservationReady: {}, homeReservationMeta: {}, homeReservationBusy: {}, homeReservationLoad: 0 } },
  methods: {
    async refreshHomeReservations() {
      const generation = ++this.homeReservationLoad
      this.homeReservationReady = {}
      const token = uni.getStorageSync('token')
      if (!token) this.homeReservationState = {}
      await Promise.all(this.displayProducts.filter(p => p.isReservation).map(async product => {
        const id = product.id
        try {
          const [meta, state] = await Promise.all([
            commerce('/reservation/detail', { id }),
            token ? commerce('/reservation/status', { id }) : Promise.resolve({ followed: false })
          ])
          if (generation !== this.homeReservationLoad || token !== uni.getStorageSync('token') || this.homeReservationBusy[id]) return
          this.homeReservationMeta = { ...this.homeReservationMeta, [id]: meta }
          this.homeReservationState = { ...this.homeReservationState, [id]: state }
          this.homeReservationReady = { ...this.homeReservationReady, [id]: true }
        } catch (_) { if (generation === this.homeReservationLoad) this.homeReservationReady = { ...this.homeReservationReady, [id]: false } }
      }))
    },
    toggleHomeReservation(product) {
      const id = product.id
      if (!this.homeReservationBusy[id] && !this.homeReservationState[id]?.followed) analytics.reservationClick(id)
      if (this.homeReservationBusy[id] || !requireLogin()) return
      if (!this.homeReservationReady[id]) {
        uni.showToast({ title: '预约信息加载中，请稍后再点', icon: 'none' })
        this.refreshHomeReservations()
        return
      }
      const meta = this.homeReservationMeta[id]
      if (meta.phase !== 'preview' || (meta.start_at > 0 && Date.now() >= meta.start_at * 1000)) return this.goToProductDetail(id, false)
      ++this.homeReservationLoad
      const followed = !this.homeReservationState[id]?.followed
      this.homeReservationBusy = { ...this.homeReservationBusy, [id]: true }
      const save = async consent => {
        try {
          const state = await commerce('/reservation/follow', { id, followed, consent, template_id: meta.template_id }, 'POST')
          this.homeReservationState = { ...this.homeReservationState, [id]: state }
          uni.showToast({ title: !followed ? '已取消关注和提醒' : state.consent === 'accept' ? '已开启开售提醒' : '已关注，尚未开启通知', icon: 'none' })
        } catch (e) { showError(e) }
        finally { this.homeReservationBusy = { ...this.homeReservationBusy, [id]: false } }
      }
      // Consent must be requested directly within the tap, using preloaded metadata.
      // #ifdef MP-WEIXIN
      if (followed && meta.template_id) {
        wx.requestSubscribeMessage({ tmplIds: [meta.template_id], success: r => save(['accept', 'reject', 'ban'].includes(r[meta.template_id]) ? r[meta.template_id] : 'unknown'), fail: () => save('unknown') })
        return
      }
      // #endif
      save('unknown')
    }
  }
}
