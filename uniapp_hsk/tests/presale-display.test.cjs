const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = process.env.HSK_SOURCE || require('node:path').resolve(__dirname, '..');
const runtime = process.env.UNI_VUE_COMPILER || 'D:/HBuilderX/plugins/uniapp-cli-vite/node_modules';
const compiler = require(runtime + '/@vue/compiler-sfc');
const parser = require(runtime + '/@babel/parser');
function load(file) {
  const source = fs.readFileSync(root + '/' + file, 'utf8');
  const parsed = compiler.parse(source, {filename:file});
  assert.deepEqual(parsed.errors, []);
  parser.parse(parsed.descriptor.script.content, {sourceType:'module'});
  assert.deepEqual(compiler.compileTemplate({source:parsed.descriptor.template.content,filename:file,id:'presale'}).errors, []);
  const sandbox = {reservationHome:{}, analytics:{}, uni:{}, api:{}, Date, setInterval:()=>1, clearInterval(){}};
  vm.runInNewContext(parsed.descriptor.script.content.replace(/^\s*import[^\n]*\n/gm,'').replace('export default','globalThis.page='), sandbox);
  return {page:sandbox.page, template:parsed.descriptor.template.content};
}
const {page:home} = load('pages/index/index.vue');
const price = home.methods.getProductPrice;
for (const zero of [0,'0','0.0','0.00',null,undefined,'']) {
  assert.equal(price({type:2,price:zero,deposit:zero}), '待公布');
  assert.equal(price({isReservation:true,type:2,price:zero,deposit:zero}), '待公布');
}
assert.equal(price({type:2,price:500,deposit:'0.00'}), '¥500.00');
assert.equal(price({type:2,price:500,deposit:100}), '定金 ¥100');
assert.equal(price({type:2,price:500,deposit:100,depositFrom:true}), '定金 ¥100起');
assert.equal(price({type:1,price:120}), '¥120.00');
assert.equal(price({isReservation:true,type:2,price:500}), '待公布');
const {page:detail,template} = load('pages/product/detail.vue');
assert.match(template,/class="presale-timeline" v-if="product.type == 2 && product.startTime"/);
assert.doesNotMatch(template,/presale-end-text|timeline-dot-end|timeline-progress|补款发货|尾款时间/);
assert.match(template,/开始预定/);
const state = detail.data();
state.product = {type:2,startTime:'2026-01-01 00:00:00',startTimeStamp:1,endTimeStamp:0,endTime:''};
for (const [name,fn] of Object.entries(detail.methods)) state[name] = fn.bind(state);
state.startCountdown();
console.log('PASS: HSK zero/unset prices, priced presales, Vue compilation and open-ended detail rendering contract');

// Render the real template so a correct computed value cannot hide an unpatched price block.
const vue = require(runtime + '/vue');
const {renderToString} = require(runtime + '/@vue/server-renderer');
const {compile} = require(runtime + '/@vue/compiler-dom');
const render = new Function('Vue', compile(template, {mode:'function', prefixIdentifiers:true, isCustomElement:()=>true}).code)(vue);
async function detailHtml(product, currentVersion=0) {
  const component = {...detail, render, data:()=>({...detail.data(), product, currentVersion, showPopup:true})};
  const app = vue.createSSRApp(component);
  app.config.warnHandler = message => { throw Error(message); };
  return renderToString(app);
}
(async()=>{
  for (const zero of [0,'0','0.00',null,undefined,'']) {
    for (const isReservation of [true,false]) {
      const html = await detailHtml({id:12,type:2,isReservation,price:zero,deposit:zero,deduct:10,version:[],image:[]});
      assert.equal((html.match(/待公布/g)||[]).length,2,'Main price and SKU popup both show pending');
      assert.doesNotMatch(html,/[¥￥]0(?:\.00)?|商品总价|定金：|抵后到手价/);
    }
  }
  const preview = await detailHtml({id:12,type:2,isReservation:true,price:500,deposit:100,version:[],image:[]});
  assert.equal((preview.match(/待公布/g)||[]).length,2,'Reservation matches homepage pending display');
  const priced = await detailHtml({id:12,type:2,price:500,deposit:100,version:[],image:[]});
  assert.match(priced,/商品总价¥500\.00/);assert.match(priced,/定金：¥100\.00/);assert.doesNotMatch(priced,/待公布/);
  const mixed = {id:12,type:2,price:500,deposit:100,version:['待定款','已定价款'],variantPrices:{'待定款':0,'已定价款':500},variantDeposits:{'待定款':0,'已定价款':100},image:[]};
  assert.equal((await detailHtml(mixed,0)).match(/待公布/g).length,2);
  assert.doesNotMatch(await detailHtml(mixed,1),/待公布/);
  const stock = await detailHtml({id:12,type:1,price:120,version:[],image:[]});
  assert.match(stock,/120\.00/);assert.doesNotMatch(stock,/待公布/);
  console.log('PASS: real detail template renders pending prices in main/popup, hides discount quotes, retains priced products and follows SKU selection');
})().catch(error=>{console.error(error);process.exitCode=1;});
