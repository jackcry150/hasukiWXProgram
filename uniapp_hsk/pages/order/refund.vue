<template>
  <view class="aftersale-page">
    <view v-if="loading" class="notice">正在加载售后信息…</view>
    <view v-else-if="error" class="notice"><text>{{ error }}</text><button @click="load">重新加载</button></view>
    <template v-else>
      <view class="heading"><text class="title">订单售后</text><text class="muted">订单 {{ detail.orderNo }}</text></view>
      <view v-if="sale" class="section">
        <text class="section-title">{{ sale.stateText }}</text>
        <view class="row"><text>{{ sale.type === 'refund_only' ? '仅退款' : '退货退款' }}</text><text class="amount">¥{{ money(sale.amount_cents) }}</text></view>
        <text class="copy">申请原因：{{ sale.reason }}</text>
        <text v-if="sale.remark" class="copy">处理说明：{{ sale.remark }}</text>
        <view v-if="sale.return_address" class="return-info"><text class="label">退货收件信息</text><text class="copy">{{ sale.return_address }}</text><button size="mini" @click="copyAddress">复制收件信息</button></view>
        <text v-if="sale.tracking_no" class="copy">寄回物流：{{ sale.company }} {{ sale.tracking_no }}</text>
        <view v-for="item in sale.refunds" :key="item.id" class="refund-line"><text>{{ phaseText(item.phase) }} ¥{{ money(item.amount_cents) }}</text><text>{{ refundText(item.state) }}</text></view>
        <text v-if="sale.state === 'processing'" class="muted copy">正在核对退款结果，请稍后刷新查看。到账以支付渠道记录为准。</text>
        <template v-if="sale.state === 'awaiting_return'">
          <label class="label" for="company">物流公司</label><input id="company" v-model="company" maxlength="100" placeholder="填写寄回的物流公司" />
          <label class="label" for="tracking">寄回运单号</label><input id="tracking" v-model="tracking" maxlength="100" placeholder="填写运单号" />
          <button class="primary" :loading="busy" :disabled="busy" @click="submitTracking">提交寄回信息</button>
        </template>
        <button v-if="sale.state === 'requested' || sale.state === 'awaiting_return'" :disabled="busy" @click="cancel">撤销售后申请</button>
      </view>
      <view v-if="types.length" class="section">
        <text class="section-title">{{ sale ? '重新申请售后' : '申请售后' }}</text>
        <radio-group @change="type = $event.detail.value"><label v-for="option in types" :key="option" class="option"><radio :value="option" :checked="type === option" color="#222222" />{{ option === 'refund_only' ? '仅退款' : '退货退款' }}</label></radio-group>
        <view class="row"><text>本次申请金额</text><text class="amount">¥{{ money(detail.amount_cents) }}</text></view>
        <text class="muted copy">本次为整单售后，金额按实际已支付金额计算。</text>
        <label class="label" for="reason">售后原因</label><textarea id="reason" v-model="reason" maxlength="500" placeholder="请说明退款或退货原因，便于商家处理" />
        <button class="primary" :loading="busy" :disabled="busy || !reason.trim()" @click="submit">提交申请</button>
      </view>
      <view v-if="!sale && !types.length" class="notice">当前订单暂不可申请售后。</view>
      <view class="footer"><button :disabled="busy" @click="refreshPayment">刷新支付与售后状态</button><button @click="contact">联系客服</button></view>
    </template>
  </view>
</template>

<script>
import request from '@/utils/request'
import { openCustomerService } from '@/utils/customer-service.js'
export default {
  data() { return { orderId: 0, detail: {}, loading: true, busy: false, error: '', type: '', reason: '', company: '', tracking: '' } },
  computed: { sale() { return this.detail.sale || null }, types() { return this.detail.types || [] } },
  onLoad(options) { this.orderId = Number(options.id); this.load() },
  onPullDownRefresh() { this.load().finally(() => uni.stopPullDownRefresh()) },
  methods: {
    money(value) { return (Number(value || 0) / 100).toFixed(2) },
    phaseText(phase) { return { deposit: '定金', balance: '尾款', full: '货款' }[phase] || '退款' },
    refundText(state) { return { ready: '待处理', processing: '退款处理中', succeeded: '退款成功', failed: '商家正在核对' }[state] || state },
    async call(action, data, post = false) {
      const result = post ? await request.post('/aftersale/' + action, data) : await request.get('/aftersale/' + action, data)
      if (result.code !== 200) throw new Error(result.msg || '操作未完成，请稍后刷新')
      return result.data
    },
    async load() {
      this.loading = true; this.error = ''
      try {
        if (!this.orderId) throw new Error('订单信息无效，请返回订单列表')
        this.detail = await this.call('detail', { id: this.orderId })
        if (!this.types.includes(this.type)) this.type = this.types[0] || ''
      } catch (e) { this.error = e.message || '加载失败，请重试' } finally { this.loading = false }
    },
    async act(fn) {
      if (this.busy) return
      this.busy = true
      try { await fn(); await this.load() } catch (e) { uni.showToast({ title: e.message || '网络异常，请刷新核对结果', icon: 'none' }) } finally { this.busy = false }
    },
    submit() { if (!this.reason.trim() || !this.type) return; return this.act(() => this.call('apply', { id: this.orderId, type: this.type, reason: this.reason.trim() }, true)) },
    submitTracking() {
      if (!this.company.trim() || !/^[A-Za-z0-9-]{4,100}$/.test(this.tracking.trim())) { uni.showToast({ title: '请填写物流公司和有效运单号', icon: 'none' }); return }
      return this.act(() => this.call('tracking', { id: this.sale.id, company: this.company.trim(), tracking_no: this.tracking.trim() }, true))
    },
    cancel() { uni.showModal({ title: '撤销售后申请', content: '确认撤销本次申请？如已寄回商品，请先联系客服。', success: result => { if (result.confirm) this.act(() => this.call('cancel', { id: this.sale.id }, true)) } }) },
    refreshPayment() { return this.act(() => this.call('paymentSync', { id: this.orderId }, true)) },
    copyAddress() { uni.setClipboardData({ data: this.sale.return_address }) },
    contact() { openCustomerService({ orderId: this.orderId }) }
  }
}
</script>

<style scoped>
.aftersale-page{min-height:100vh;background:#f5f5f5;color:#222;padding:32rpx 28rpx calc(40rpx + env(safe-area-inset-bottom));box-sizing:border-box}.heading{padding:12rpx 4rpx 32rpx}.title{display:block;font-size:42rpx;font-weight:600;margin-bottom:12rpx}.muted{color:#666;font-size:26rpx;line-height:1.65}.section{background:#fff;padding:32rpx;margin-bottom:24rpx;border-radius:16rpx}.section-title{display:block;font-size:32rpx;font-weight:600;margin-bottom:24rpx}.row,.refund-line{display:flex;justify-content:space-between;gap:16rpx;align-items:center;margin:24rpx 0;font-size:28rpx}.amount{font-weight:600}.copy{display:block;white-space:pre-wrap;word-break:break-all;font-size:28rpx;line-height:1.7;margin:16rpx 0}.label{display:block;font-size:28rpx;margin:28rpx 0 14rpx}.option{display:flex;align-items:center;font-size:30rpx;padding:16rpx 0}.return-info{border-top:1px solid #eee;margin-top:24rpx}.notice{padding:48rpx 16rpx;font-size:28rpx;line-height:1.8;text-align:center}input,textarea{background:#f5f5f5;border:1px solid #ddd;border-radius:8rpx;padding:20rpx;font-size:28rpx;box-sizing:border-box;width:100%}input{height:86rpx}textarea{height:220rpx}button{font-size:28rpx;margin-top:24rpx;background:#fff;color:#222;border:1px solid #bbb;border-radius:10rpx;line-height:2.8}button::after{border:0}.primary{background:#222;color:#fff;border-color:#222}.primary[disabled]{background:#777;color:#fff}.footer{padding:0 4rpx}.refund-line{padding-top:20rpx;border-top:1px solid #eee}
</style>
