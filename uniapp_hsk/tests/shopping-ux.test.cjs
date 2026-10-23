const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const root = process.argv[2] || path.resolve(__dirname, '..');
const runtime = process.env.UNI_VUE_COMPILER || 'D:/HBuilderX/plugins/uniapp-cli-vite/node_modules';
const compiler = require(runtime + '/@vue/compiler-sfc');
const parser = require(runtime + '/@babel/parser');
const files = ["pages/product/list.vue","pages/product/detail.vue","pages/index/index.vue","pages/my/index.vue","pages/collect/collect.vue","pages/doll/female.vue","pages/album/details.vue","pages/order/list.vue","pages/login/login.vue"];
for (const file of files.filter(file => file.endsWith('.vue'))) {
  const source = fs.readFileSync(path.join(root,file),'utf8');
  const parsed = compiler.parse(source,{filename:file});
  assert.deepEqual(parsed.errors,[],file);
  parser.parse(parsed.descriptor.script.content,{sourceType:'module'});
  const result = compiler.compileTemplate({source:parsed.descriptor.template.content,filename:file,id:'ux-review'});
  assert.deepEqual(result.errors,[],file);
}
const helperSource = fs.readFileSync(path.join(root,'utils/catalog-browse.js'),'utf8');
const helper = {};
vm.runInNewContext(helperSource.replaceAll('export function','function') + '\nObject.assign(globalThis,{browseProducts,productScales,productSubtitle,saleState,albumSearchKeyword,decodeSearchKeyword});', helper);
const ids = rows => Array.from(rows, row => row.id);
const products = [
  {id:1,title:'监修 1/24',is_supervising:1,type:1},
  {id:2,title:'猫娘 GM-N-007 1/12',type:1,price:138},
  {id:3,title:'爱丽丝 1/6',type:2,startTimeStamp:50,endTimeStamp:200,deposit:20},
  {id:4,title:'已结束 1/6',type:2,endTimeStamp:99},
  {id:5,title:'未开售',type:1,startTimeStamp:200},
  {id:6,title:'预约',isReservation:true},
  {id:7,title:'1/60 衣服',type:1},
];
assert.deepEqual(ids(helper.browseProducts([...products, products[2]],{now:100})),[2,3,7,1,5,6,4]);
assert.deepEqual(ids(helper.browseProducts(products,{now:100,state:'stock'})),[2,7]);
assert.deepEqual(ids(helper.browseProducts(products,{now:100,state:'presale'})),[3]);
assert.deepEqual(ids(helper.browseProducts(products,{now:100,state:'preview'})),[1,5,6]);
assert.deepEqual(ids(helper.browseProducts(products,{now:100,scale:'1/6'})),[3,4]);
assert.deepEqual(ids(helper.browseProducts(products,{now:100,keyword:'猫娘 gm-n'})),[2]);
assert.deepEqual(ids(helper.browseProducts(products,{now:100,keyword:'无匹配'})),[]);
assert.deepEqual(Array.from(helper.productScales({title:'1：12 / 1／6 1:12'})),['1/12','1/6']);
assert.deepEqual(Array.from(helper.productScales({title:'6寸娃衣'})),[], 'Do not invent a ratio from inches');
assert.equal(helper.saleState({type:2,endTimeStamp:100},100),'closed');
assert.equal(helper.productSubtitle({title:'猫娘',subtitle:'猫娘'}),'');
assert.equal(helper.productSubtitle({title:'猫娘',subtitle:'适配 OB24'}),'适配 OB24');
assert.equal(helper.albumSearchKeyword({title:'橘猫智酷 爱丽丝 来源：松花鱼'}),'爱丽丝');
assert.equal(helper.decodeSearchKeyword('%E5%A4%A9%E7%8B%BCQ25'),'天狼Q25');
assert.equal(helper.decodeSearchKeyword('A%26B'),'A&B');
assert.equal(helper.decodeSearchKeyword('100%棉'),'100%棉');
const calls = [], storage = new Map([['token','test-session']]);
const uni = { setNavigationBarTitle(){}, stopPullDownRefresh(){}, hideKeyboard(){}, showToast(){},
  getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value),
  navigateTo:args=>calls.push(args), redirectTo:args=>calls.push(args), showModal:args=>args.success({confirm:true}) };
function load(file, additions={}) {
  const source = fs.readFileSync(path.join(root,file),'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^[ \t]*import[ \t]+[^\n]+[ \t]+from[ \t]+['"][^'"]+['"][ \t]*;?/gm,'')
    .replace('export default','globalThis.component =');
  const sandbox={...helper,uni,api:{},OrderGroups:{},console:{error(){}},...additions};
  vm.runInNewContext(script,sandbox);
  const def=sandbox.component,ctx=def.data ? def.data() : {};
  Object.assign(ctx,{$refs:{}});
  for(const [key, fn] of Object.entries(def.methods || {}))ctx[key]=fn.bind(ctx);
  for(const [key, fn] of Object.entries(def.computed || {}))Object.defineProperty(ctx,key,{get:()=>fn.call(ctx)});
  return {def,ctx};
}
(async()=>{
  let pending=[];
  const {ctx:catalog}=load('pages/product/list.vue',{api:{product:{list:params=>new Promise(resolve=>pending.push({params,resolve}))}}});
  const first=catalog.fetchProducts(),second=catalog.changeCategory('anime');
  pending[1].resolve({code:200,data:{hot:[{id:2,title:'猫娘 1/12',category_code:'anime'}],recom:[]}});await second;
  pending[0].resolve({code:200,data:{hot:[{id:1,title:'旧分类',category_code:'military'}],recom:[]}});await first;
  assert.deepEqual(ids(catalog.displayProducts),[2],'Stale category response must not replace newer selection');
  catalog.searchKeyword='无匹配';assert.equal(catalog.catalogSummary,'0 件');
  const reset=catalog.resetFilters();pending[2].resolve({code:200,data:{hot:products,recom:[]}});await reset;
  assert.equal(catalog.activeCategoryCode,'');assert.equal(catalog.searchKeyword,'');
  assert.equal(catalog.getProductPrice({isReservation:true,price:0}),'价格待公布');
  const keywordPage=load('pages/product/list.vue');keywordPage.ctx.fetchProducts=()=>{};
  keywordPage.def.onLoad.call(keywordPage.ctx,{keyword:'%E5%A4%A9%E7%8B%BCQ25'});
  assert.equal(keywordPage.ctx.searchKeyword,'天狼Q25');
  const {ctx:album}=load('pages/album/details.vue');album.albumInfo={title:'橘猫智酷 A&B 来源：摄影师'};album.searchProducts();
  assert.equal(calls.at(-1).url,'/pages/product/list?keyword=A%26B');
  pending=[];
  const {ctx:orders}=load('pages/order/list.vue',{api:{order:{list:params=>new Promise((resolve,reject)=>pending.push({params,resolve,reject}))}}});
  const o1=orders.loadOrders(0),o2=orders.loadOrders(2);
  pending[1].resolve({code:200,data:[{id:2,orderNo:'ABC123',product:[{title:'猫娘'}]}]});await o2;
  pending[0].reject(new Error('old request failed'));await o1;
  assert.equal(orders.loadError,false);assert.deepEqual(ids(orders.visibleOrders),[2]);
  orders.searchKeyword='abc';assert.deepEqual(ids(orders.visibleOrders),[2]);
  orders.searchKeyword='爱丽丝';assert.equal(orders.visibleOrders.length,0);
  orders.currentTab=8;orders.goLogin();assert.equal(storage.get('commerceReturnPath'),'/pages/order/list?status=8');
  const {ctx:collect}=load('pages/collect/collect.vue',{api:{collect:{list:async()=>{throw new Error('offline')}}}});
  await collect.getCollectList();assert.equal(collect.loading,false);assert.equal(collect.loadError,true);
  const {ctx:detail}=load('pages/product/detail.vue',{analytics:{},commerce(){},requireLogin(){},showError(){}});
  detail.product={price:100,deposit:20,version:['红'],variantDeposits:{'红':30}};detail.currentVersion=0;
  assert.equal(detail.selectedBalanceText,'70.00','Tail payment must reflect selected variant deposit');
  console.log('PASS: Vue templates/scripts, catalog filters and time boundaries, category/order races, album navigation, login return, collection failure recovery and variant balance.');
})().catch(error=>{console.error(error);process.exitCode=1});
