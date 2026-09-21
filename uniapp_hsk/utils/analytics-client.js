'use strict';
// Only explicit fields are persisted. URLs, tokens, contacts and request bodies never enter telemetry.
function createTracker(options) {
 const {uni,endpoint,appCode,version='',enabled=false}=options;
 const now=options.now||(()=>Date.now());
 const uid=options.uid||(()=>now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2));
 const key='analytics-v1-'+appCode;let visitor='',queue=[],session='',channel='',visible=false,view=null,inflight=false,timer=null,lastHide=0;
 const read=k=>{try{return uni.getStorageSync(k);}catch{return null;}};
 const persist=()=>{try{uni.setStorageSync(key,{visitor,queue:queue.slice(-200)});}catch{}};
 const trim=()=>{queue=queue.filter(x=>x&&x.context&&x.event&&x.event.occurred_at>now()/1000-172000).slice(-200);};
 if(enabled){const saved=read(key)||{};visitor=/^[A-Za-z0-9_-]{1,80}$/.test(saved.visitor||'')?saved.visitor:uid();queue=Array.isArray(saved.queue)?saved.queue:[];trim();persist();}
 function context(){return {visitor_id:visitor,session_id:session,channel_code:channel,version};}
 function track(name,fields={}){if(!enabled||!session)return;const event={event_id:uid(),event_name:name,occurred_at:Math.floor(now()/1000),occurred_ms:now()};
  ['page','view_id','product_id','duration_ms','scroll_depth','error_code'].forEach(k=>{if(fields[k]!=null)event[k]=fields[k];});queue.push({context:context(),event});trim();persist();}
 function progress(){if(!view||!visible)return;const total=view.accumulated+Math.max(0,now()-view.started);track('page_progress',{page:view.page,view_id:view.id,product_id:view.product,duration_ms:Math.min(total,1800000),scroll_depth:view.depth});}
 async function flush(){if(!enabled||inflight)return;trim();if(!queue.length)return;inflight=true;
  try{for(let batchNo=0;batchNo<5&&queue.length;batchNo++){
   const first=queue[0].context,batch=[];for(const item of queue){if(batch.length>=40||JSON.stringify(item.context)!==JSON.stringify(first))break;batch.push(item);}
   const result=await new Promise((resolve,reject)=>uni.request({url:endpoint.replace(/\/$/,'')+'/api/analytics/collect',method:'POST',timeout:8000,
    header:{'Content-Type':'application/json','X-App-Code':appCode},data:{...first,events:batch.map(x=>x.event)},success:resolve,fail:reject}));
   if(!(result.statusCode===200&&result.data&&result.data.code===200)){
    if(result.statusCode!==400&&result.statusCode!==413)break;
   }
   const ids=new Set(batch.map(x=>x.event.event_id));queue=queue.filter(x=>!ids.has(x.event.event_id));persist();
  }}catch{/* Retry on the next tick or foreground. */}finally{inflight=false;}}
 function startTimer(){if(!timer&&enabled)timer=setInterval(()=>{if(visible)progress();flush();},15000);}
 function show(entry={}){if(!enabled||visible)return;const fresh=!session||(lastHide&&now()-lastHide>=1800000);visible=true;
  if(fresh){session=uid();const ac=entry.query&&entry.query.ac;channel=typeof ac==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(ac)?ac:(Number(entry.scene)>0?'wx_'+Number(entry.scene):'');track('session_start');if(view){view.id=uid();view.accumulated=0;view.seen={};track('page_view',{page:view.page,view_id:view.id,product_id:view.product});}}
  if(view)view.started=now();startTimer();flush();}
 function hide(){if(!enabled||!visible)return;progress();if(view)view.accumulated+=Math.max(0,now()-view.started);visible=false;lastHide=now();if(timer){clearInterval(timer);timer=null;}flush();}
 function enterPage(page,productId=0){if(!enabled)return;if(view)progress();view={id:uid(),page,product:Number(productId)||0,started:now(),accumulated:0,depth:0,seen:{}};track('page_view',{page,view_id:view.id,product_id:view.product});}
 function leavePage(page){if(!view||(page&&view.page!==page))return;progress();view=null;flush();}
 function scroll(percent){if(view)view.depth=Math.max(view.depth,Math.max(0,Math.min(100,Number(percent)||0)));}
 function action(name,fields={}){track(name,{page:view?view.page:'',view_id:view?view.id:'',product_id:view?view.product:0,...fields});}
 function once(name,productId=0){if(!view)return;const id=name+'|'+productId;if(view.seen[id])return;view.seen[id]=true;action(name,{product_id:Number(productId)||0});}
 function headers(){return enabled&&session?{'X-Analytics-Visitor':visitor,'X-Analytics-Session':session,'X-Analytics-Channel':channel,'X-Analytics-Version':version}:{};}
 return {show,hide,enterPage,leavePage,scroll,action,once,flush,headers,context,destroy:hide};
}
export {createTracker};
