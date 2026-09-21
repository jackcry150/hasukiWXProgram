<template>
  <view class="supplement-page">
    <view v-if="error" class="section"><view class="title">暂时无法打开补款</view><view class="hint">{{ error }}</view><button :disabled="busy" @tap="load">重新加载</button></view>
    <view v-else-if="!receipt" class="section">正在加载补款信息…</view>
    <view v-else class="section">
      <view class="status">{{ stateText }}</view><view class="title">订单补款</view><view class="amount">￥{{ receipt.amount }}</view>
      <view class="label">补款原因</view><view class="reason">{{ receipt.reason }}</view>
      <view class="label">关联订单</view><view class="value">{{ receipt.order_no }}</view>
      <view class="label">{{ receipt.paid_at ? '付款确认时间' : '链接有效期至' }}</view><view class="value">{{ localTime(receipt.paid_at || receipt.expires_at) }}</view>
      <view v-if="receipt.state==='paid'" class="hint">补款已确认，请勿重复付款。</view>
      <view v-else-if="receipt.state==='paying'" class="hint">支付已发起，可刷新核对结果。若已扣款，请等待确认。</view>
      <view v-else-if="['expired','cancelled','failed'].includes(receipt.state)" class="hint">此笔补款已结束，如仍需补款请联系客服。</view>
      <button v-if="receipt.can_pay" class="primary" :loading="busy" :disabled="busy" @tap="pay">{{ receipt.state==='paying' ? '继续支付' : '确认补款' }} ￥{{ receipt.amount }}</button>
      <button v-if="receipt.state==='paying'" :disabled="busy" @tap="sync">刷新支付结果</button>
      <view v-if="notice" class="hint">{{ notice }}</view>
    </view>
  </view>
</template>
<script>
import { commerce,requireLogin,localTime } from '@/utils/commerce.js'
export default {
  data:()=>({code:'',receipt:null,error:'',notice:'',busy:false}),
  computed:{stateText(){return {pending:'待补款',paying:'支付待确认',paid:'补款成功',failed:'支付失败',expired:'链接已过期',cancelled:'补款已撤销'}[this.receipt?.state] || ''}},
  onLoad(o){this.code=o.code || '';uni.hideShareMenu({menus:['shareAppMessage','shareTimeline']})},
  onShow(){if(!this.busy)this.load()},
  methods:{
    localTime,
    async load(){
      if(!/^[a-f0-9]{32}$/.test(this.code)){this.receipt=null;this.error='链接无效，请通过客服发送的补款链接进入';return}
      if(!requireLogin())return;
      try{this.receipt=await commerce('/supplement/detail',{code:this.code});this.error='';if(this.receipt.state==='paying')await this.refresh()}catch(e){this.receipt=null;this.error=e.message}
    },
    async refresh(){try{this.receipt=await commerce('/supplement/sync',{code:this.code},'POST');this.notice=this.receipt.state==='paying'?'支付结果还在确认中，请稍后刷新':''}catch(e){this.notice=e.message}},
    async sync(){if(this.busy||!requireLogin())return;this.busy=true;try{await this.refresh()}finally{this.busy=false}},
    async pay(){
      if(this.busy||!this.receipt?.can_pay||!requireLogin())return;this.busy=true;this.notice='';
      try{
        const out=await commerce('/supplement/pay',{code:this.code},'POST');
        await new Promise((resolve,reject)=>uni.requestPayment({...out.payment,provider:'wxpay',success:resolve,fail:reject}));
        this.notice='正在确认补款结果';
      }catch(e){this.notice=/cancel/.test(e.errMsg||'')?'已取消支付，可继续支付或刷新结果':e.message||'支付未完成，请刷新支付结果'}
      finally{try{this.receipt=await commerce('/supplement/detail',{code:this.code});if(this.receipt.state==='paying')await this.refresh()}catch(e){this.notice=e.message}this.busy=false}
    }
  }
}
</script>
<style scoped>
.supplement-page{min-height:100vh;background:#f5f6f8;padding:32rpx;box-sizing:border-box;color:#242424}.section{background:white;border-radius:16rpx;padding:40rpx}.status{font-size:26rpx;color:#60656c}.title{font-size:40rpx;font-weight:600;margin:18rpx 0}.amount{font-size:68rpx;font-weight:600;margin:24rpx 0 44rpx}.label{font-size:24rpx;color:#60656c;margin-top:30rpx}.value,.reason{font-size:30rpx;line-height:1.7;margin-top:8rpx;overflow-wrap:anywhere}.reason{white-space:pre-wrap}.hint{font-size:26rpx;color:#60656c;line-height:1.8;margin:30rpx 0}.primary{background:#242424;color:white}button{margin-top:28rpx;font-size:30rpx;border-radius:10rpx}button[disabled]{opacity:.55}
</style>
