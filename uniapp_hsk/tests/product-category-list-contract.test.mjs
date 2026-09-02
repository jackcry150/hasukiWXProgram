import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const pageUrl = new URL('../pages/product/list.vue', import.meta.url)
const pageSource = await readFile(pageUrl, 'utf8')
const scriptMatch = pageSource.match(/<script>([\s\S]*?)<\/script>/)

assert.ok(scriptMatch, '商品列表页必须包含 script 区块')
assert.match(pageSource, /@click="changeCategory\(category\.code\)"/, '分类标签必须支持点击切换')
assert.match(pageSource, /\/pages\/product\/list\?category_code=/, '分类分享链接必须保留 category_code')

for (const [code, label] of [
	['military', '军事'],
	['anime', '二次元'],
	['figure', '手办'],
	['accessory_pack', '配件包'],
	['clothing_pack', '服装包'],
	['doll_socks', '袜子']
]) {
	assert.match(pageSource, new RegExp(`code: '${code}'.*label: '${label}'`), `${label}分类必须使用稳定编码`)
}

const requests = []
let responseMode = 'success'
const api = {
	product: {
		async list(params) {
			requests.push(params)
			if (responseMode === 'failure') throw new Error('network failed')
			return {
				code: 200,
				data: {
					hot: [
						{ id: 1, category_code: 'military', title: '军事商品', image: [] },
						{ id: 2, category_code: 'anime', title: '二次元商品', image: [] },
						{ id: 4, category_code: 'doll_socks', title: '袜子商品', image: [] }
					],
					recom: [
						{ id: 1, category_code: 'military', title: '重复军事商品', image: [] },
						{ id: 3, category_code: 'military', title: '军事推荐商品', image: [] }
					]
				}
			}
		}
	}
}

const navigationTitles = []
const runnableScript = scriptMatch[1]
	.replace(/import\s+\{\s*api\s*\}\s+from\s+['"][^'"]+['"]/, 'const api = globalThis.api')
	.replace('export default', 'globalThis.component =')

const sandbox = {
	api,
	uni: {
		setNavigationBarTitle({ title }) { navigationTitles.push(title) },
		stopPullDownRefresh() {},
		showToast() {},
		navigateTo() {}
	},
	console: { ...console, error() {} },
	Set,
	Number,
	String,
	Array,
	Error,
	JSON,
	encodeURIComponent
}

vm.runInNewContext(runnableScript, sandbox)

const definition = sandbox.component
const page = {
	...definition.data(),
	...definition.methods
}

for (const [name, getter] of Object.entries(definition.computed)) {
	Object.defineProperty(page, name, { get: () => getter.call(page) })
}

await page.fetchProducts(true)
assert.equal(requests[0], undefined, '全部商品请求不应附带分类参数')
assert.equal(page.displayProducts.length, 4, '全部商品必须合并热门与推荐并去重')

await page.changeCategory('military')
assert.equal(requests[1]?.category_code, 'military', '分类切换必须向后端传递 category_code')
assert.equal(JSON.stringify(page.displayProducts.map((item) => item.id)), '[1,3]', '必须严格过滤后端混合分类数据并去重')
assert.equal(navigationTitles.at(-1), '军事系列', '分类切换必须同步导航标题')
assert.equal(page.getSharePath(), '/pages/product/list?category_code=military', '分类分享路径必须可直达')

await page.changeCategory('doll_socks')
assert.equal(requests[2]?.category_code, 'doll_socks', '袜子分类必须向后端传递 doll_socks')
assert.equal(JSON.stringify(page.displayProducts.map((item) => item.id)), '[4]', '袜子分类只能展示袜子商品')
assert.equal(navigationTitles.at(-1), '袜子系列', '袜子分类必须同步导航标题')
assert.equal(page.getSharePath(), '/pages/product/list?category_code=doll_socks', '袜子分类分享路径必须可直达')

await page.changeCategory('unknown-category')
assert.equal(page.activeCategoryCode, '', '非法分类参数必须安全回退到全部商品')
assert.equal(requests.at(-1), undefined, '回退全部商品时必须保持旧接口兼容请求')

responseMode = 'failure'
await page.fetchProducts(true)
assert.equal(page.loadError, true, '接口失败必须进入错误状态')
assert.equal(page.displayProducts.length, 0, '接口失败后不得残留旧分类商品')

console.log('Hasuki product category list contract test passed')
