const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const root = process.env.HSK_SOURCE || path.resolve(__dirname, '..');
const compilerRoot = process.env.UNI_VUE_COMPILER || 'D:/HBuilderX/plugins/uniapp-cli-vite/node_modules';
const sfc = require(path.join(compilerRoot, '@vue/compiler-sfc'));
const dom = require(path.join(compilerRoot, '@vue/compiler-dom'));
const runtime = fs.readFileSync(path.join(compilerRoot, '@dcloudio/uni-mp-vue/dist/vue.runtime.esm.js'), 'utf8');
const begin = runtime.indexOf('function createInvoker(');
const end = runtime.indexOf('\nfunction ', begin + 1);
const queue = [];
const ctx = {
  patchMPEvent() {},
  patchStopImmediatePropagation: (event, handler) => handler,
  callWithAsyncErrorHandling: (handler, instance, kind, args) => handler(...args),
  isArray: Array.isArray,
  isPromise: value => value && typeof value.then === 'function',
  setTimeout: handler => queue.push(handler)
};
vm.createContext(ctx);
vm.runInContext(runtime.slice(begin, end) + '\nthis.makeInvoker = createInvoker;', ctx);
let synchronous = true, calls = 0;
const handler = ctx.makeInvoker(() => { assert.equal(synchronous, true); calls++; });
handler({ type: 'tap', target: { dataset: { eventsync: 'true' } } });
assert.equal(calls, 1);
assert.equal(queue.length, 0);
handler({ type: 'tap', target: { dataset: {} } });
assert.equal(queue.length, 1, 'Baseline tap is delayed by the installed runtime');
const files = ['index/index', 'my/index', 'product/detail', 'order/detail', 'ai/customer', 'customer/customer'];
const registered = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8')).pages.map(page => page.path);
let targets = 0;
for (const file of files) {
  const source = fs.readFileSync(path.join(root, 'pages', file + '.vue'), 'utf8');
  const ast = dom.baseParse(sfc.parse(source).descriptor.template.content);
  let pageTargets = 0;
  function visit(node, active = false) {
    if (node.type === 1) {
      const click = node.props.find(p => p.type === 7 && p.name === 'on');
      if (click && /goToCustomer|goToAiCustomer|goToManualCustomer|handleQuickCard|goToPage\(item.url\)|handleBannerClick/.test(click.exp.content)) active = true;
      if (active) {
        const attr = node.props.find(p => p.name === 'data-eventsync' || (p.arg && p.arg.content === 'data-eventsync'));
        assert.ok(attr, file + ': child tap target <' + node.tag + '> lacks eventsync');
        if (attr.type === 6) assert.equal(attr.value.content, 'true');
        else assert.equal(attr.exp.content, "item.url === '/pages/customer/customer'");
        targets++; pageTargets++;
      }
    }
    for (const child of node.children || []) visit(child, active);
  }
  visit(ast);
  assert.ok(pageTargets > 0);
  if (registered.includes('pages/' + file)) {
    const output = fs.readFileSync(path.join(root, 'unpackage/dist/dev/mp-weixin/pages', file + '.wxml'), 'utf8');
    assert.equal((output.match(/data-eventsync=/g) || []).length, pageTargets, file + ': compiled WXML is stale');
  }
}
console.log('PASS: installed runtime executes sync taps without a timer; ' + targets + ' service tap targets across 6 source pages; registered pages have updated compiled WXML.');
