const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const runtime='D:/HBuilderX/plugins/uniapp-cli-vite/node_modules';
const compiler=require(runtime+'/@vue/compiler-sfc'),vue=require(runtime+'/vue');
const {compile}=require(runtime+'/@vue/compiler-dom'),{renderToString}=require(runtime+'/@vue/server-renderer');
const file=path.join(root,'pages/my/privacy.vue'),source=fs.readFileSync(file,'utf8');
const parsed=compiler.parse(source,{filename:file});assert.deepEqual(parsed.errors,[]);
let reply,calls=[];
const sandbox={api:{news:{detail(params){calls.push(params);return reply();}}}};
vm.runInNewContext(parsed.descriptor.script.content.replace(/^\s*import[^\n]*\n/gm,'').replace('export default','globalThis.page='),sandbox);
const component=sandbox.page;
const render=new Function('Vue',compile(parsed.descriptor.template.content,{mode:'function',prefixIdentifiers:true,isCustomElement:()=>true}).code)(vue);
function state(){const data=component.data();for(const [key,method]of Object.entries(component.methods))data[key]=method.bind(data);return data;}
async function html(data){const snapshot=Object.fromEntries(Object.keys(component.data()).map(key=>[key,data[key]]));const app=vue.createSSRApp({...component,render,data:()=>snapshot});app.config.warnHandler=message=>{throw Error(message);};return renderToString(app);}
const disclosure='为改进浏览、预约和购物体验，我们记录随机访客标识、访问页面、可见停留时长、商品操作、入口渠道及必要的错误分类，并与预约和订单结果关联。统计事件不包含姓名、手机号、收货地址、聊天内容或支付凭证。';
(async()=>{
 let resolveRequest;reply=()=>new Promise(resolve=>{resolveRequest=resolve;});
 const data=state(),loading=data.loadContent();
 assert.match(await html(data),/隐私政策加载中/);
 assert.equal(calls.at(-1).code,'privacy_policy');
 const body='测试品牌隐私政策\n测试用政策正文。\n\n运营统计说明\n'+disclosure;
 resolveRequest({code:200,data:{content:body}});await loading;
 assert.equal(data.content,body);assert.equal(data.loading,false);assert.equal(data.loadError,'');
 assert.match(await html(data),/测试用政策正文/);
 for(const content of ['', '  ', disclosure, '运营统计说明：'+disclosure, '运营统计说明\n'+disclosure]){
  reply=async()=>({code:200,data:{content}});await data.loadContent();
  assert.equal(data.content,'');assert.match(data.loadError,/暂不可用/);
  const rendered=await html(data);assert.match(rendered,/重新加载/);assert.doesNotMatch(rendered,/随机访客标识/);
 }
 reply=async()=>{throw Error('offline');};await data.loadContent();
 assert.match(await html(data),/检查网络/);assert.equal(data.loading,false);
 reply=async()=>({code:100,msg:'记录不存在'});await data.loadContent();
 assert.match(await html(data),/暂不可用/);
 reply=async()=>({code:200,data:{content:body}});await data.loadContent();
 assert.equal(data.loadError,'');assert.match(await html(data),/测试用政策正文/);
 const config=JSON.parse(fs.readFileSync(path.join(root,'pages.json'),'utf8'));
 assert.equal(config.pages.find(page=>page.path==='pages/my/privacy').style.navigationBarTitleText,'隐私政策');
 console.log('PASS: policy route, real template loading/full content/empty/summary-only/network/retry states and navigation title');
})().catch(error=>{console.error(error);process.exitCode=1;});
