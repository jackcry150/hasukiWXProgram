import { createTracker } from './analytics-client.js'

export function createAnalytics(appCode) {
 const endpoint='https://api.goomooplay.com', version='1.0.20260917.1'
 const tracker=createTracker({uni,endpoint,appCode,version,enabled:true})
 let active=null, entry={}, installed=false
 const guarded=fn=>{try{return fn()}catch(_){}}
 const route=vm=>vm&&vm.$scope&&vm.$scope.route
 const productId=item=>Number(item&&(item.productId||item.id))||0
 function scan(vm) {
  if(active!==vm)return
  const page=route(vm)
  if(page==='pages/product/detail'&&vm.product&&vm.product.id){
   tracker.once('product_view',vm.product.id)
   if(vm.product.isReservation)tracker.once('reservation_view',vm.product.id)
  }
  if(page==='pages/order/create'&&Array.isArray(vm.product))vm.product.forEach(p=>tracker.once('checkout_view',productId(p)))
  if(!Array.isArray(vm.displayProducts)||!uni.createSelectorQuery)return
  uni.createSelectorQuery().in(vm).selectAll('.analytics-product').fields({rect:true,dataset:true}).exec(result=>guarded(()=>{
   if(active!==vm)return
   const height=uni.getWindowInfo().windowHeight
   ;(result[0]||[]).forEach(rect=>{
    if(rect.bottom>0&&rect.top<height&&rect.dataset&&Number(rect.dataset.analyticsId)>0){
     const id=Number(rect.dataset.analyticsId);tracker.once('product_impression',id)
     if(rect.dataset.analyticsReservation===true||rect.dataset.analyticsReservation==='true'||rect.dataset.analyticsReservation===1)tracker.once('reservation_view',id)
    }
   })
  }))
 }
 function measure(vm,event){guarded(()=>{
  if(active!==vm)return
  if(!vm.__analyticsScan){vm.__analyticsScan=setTimeout(()=>{vm.__analyticsScan=null;scan(vm)},250)}
  uni.createSelectorQuery().in(vm).select('.analytics-page').boundingClientRect(rect=>{
   if(rect&&active===vm){const h=uni.getWindowInfo().windowHeight;tracker.scroll(rect.height<=h?100:Math.min(100,100*(Number(event.scrollTop)||0)/(rect.height-h)))}
  }).exec()
 })}
 function install(app){if(installed)return;installed=true
  app.mixin({
   onLoad(options){if(!route(this))return;this.__analyticsOptions=options||{}},
   onShow(){guarded(()=>{if(!route(this))return;active=this;const page=route(this),opt=this.__analyticsOptions||{};
    tracker.enterPage(page,/^pages\/(product|reservation)\/detail$/.test(page)?Number(opt.id)||0:0)
    if(page==='pages/login/login')tracker.action('login_start')
    if(entry.query&&entry.query.an==='launch'){tracker.action('notification_open');entry={}}
    this.$nextTick(()=>scan(this))
   })},
   onReady(){guarded(()=>scan(this))},
   updated(){guarded(()=>{if(active===this&&!this.__analyticsScan)this.__analyticsScan=setTimeout(()=>{this.__analyticsScan=null;scan(this)},250)})},
   onPageScroll(e){measure(this,e)},
   onHide(){guarded(()=>{if(active===this){tracker.leavePage(route(this));active=null}})},
   onUnload(){guarded(()=>{if(active===this){tracker.leavePage(route(this));active=null}clearTimeout(this.__analyticsScan)})}
  })
  uni.addInterceptor('request',{invoke(config){guarded(()=>{
   if(typeof config.url!=='string'||!config.url.startsWith(endpoint+'/api/')||config.url.startsWith(endpoint+'/api/analytics/'))return
   config.header={...config.header,...tracker.headers()}
   const path=config.url.slice((endpoint+'/api').length).split('?')[0].toLowerCase(),data=config.data||{},success=config.success,fail=config.fail
   if(path==='/order/pay')tracker.action('pay_click')
   config.success=function(res){guarded(()=>{
    // The legacy sale endpoint uses 1 for data and 0 for an expected empty state.
    // Keep this exception endpoint-specific so other business failures remain visible.
    const body=res.data
    const businessOk=body&&(path==='/sell/latest'
     ? ((body.code===1&&body.data&&typeof body.data==='object'&&!Array.isArray(body.data))
       ||(body.code===0&&body.data===null&&body.msg==='暂无贩售'))
     : body.code===200)
    const ok=res.statusCode===200&&businessOk
    if(ok&&path==='/auth/onlogin')tracker.action('login_success')
    if(ok&&path==='/cart/create')tracker.action('cart_add',{product_id:Number(data.productId||data.id)||0})
    if(!ok){const error=path==='/order/shippingquote'?'SHIPPING_QUOTE_FAILED':path==='/auth/onlogin'?'LOGIN_FAILED':path==='/order/pay'?'PAY_FAILED':'REQUEST_FAILED';tracker.action('client_error',{error_code:error})}
   });if(success)return success.apply(this,arguments)}
   config.fail=function(){guarded(()=>tracker.action('client_error',{error_code:path==='/order/shippingquote'?'SHIPPING_QUOTE_FAILED':'REQUEST_FAILED'}));if(fail)return fail.apply(this,arguments)}
  })}})
  uni.addInterceptor('requestPayment',{invoke(config){const fail=config.fail;config.fail=function(error){guarded(()=>tracker.action('client_error',{error_code:/cancel/i.test(error&&error.errMsg||'')?'PAY_CANCELLED':'PAY_FAILED'}));if(fail)return fail.apply(this,arguments)}}})
 }
 return {install,show(options){entry=options||{};guarded(()=>tracker.show(entry))},hide(){guarded(()=>tracker.hide())},reservationClick(id){guarded(()=>tracker.action('reservation_click',{product_id:Number(id)||0}))},tracker}
}
