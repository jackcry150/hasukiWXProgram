import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

const detail = await read('../pages/product/detail.vue')
const home = await read('../pages/index/index.vue')
const cart = await read('../pages/cart/cart.vue')
const createOrder = await read('../pages/order/create.vue')
const orderList = await read('../pages/order/list.vue')
const orderDetail = await read('../pages/order/detail.vue')

assert.match(detail, /<view class="spec-title">颜色<\/view>/, '商品详情必须明确提示选择颜色')
assert.match(detail, /title: '请选择颜色'/, '未选到有效颜色时必须阻止购买')
assert.match(detail, /version: this\.product\.version\[this\.currentVersion\]/, '加入购物车必须提交所选颜色')
assert.match(detail, /version=\$\{version\}/, '立即购买必须携带所选颜色')
assert.match(detail, /variantImages\[this\.selectedColor\]/, '选中颜色后必须读取对应预览图')
assert.match(detail, /variantPrices\[this\.selectedColor\]/, '选中颜色后必须读取对应款式价格')
assert.match(detail, /selectedPriceText/, '商品详情价格必须随所选款式更新')
assert.match(detail, /v-for="\(image, index\) in activePreviewImages"/, '商品主预览必须随颜色切换')
assert.match(createOrder, /colorImage \|\| \(Array\.isArray\(p\.image\)/, '立即购买确认页必须优先显示颜色预览图')
assert.match(createOrder, /p\.variantPrices\[versionStr\]/, '立即购买确认页必须使用所选款式价格')
assert.match(home, /colorOptions\.length > 1/, '首页遇到多颜色商品时不能静默选择第一个颜色')
assert.match(home, /pages\/product\/detail\?id=\$\{product\.id\}/, '多颜色商品应进入详情页选择颜色')

for (const [source, page] of [
	[cart, '购物车'],
	[createOrder, '确认订单'],
	[orderList, '订单列表'],
	[orderDetail, '订单详情']
]) {
	assert.match(source, /颜色：\{\{[^}]+\.version \}\}/, `${page}必须回显颜色`)
}

console.log('Hasuki product color options frontend contract test passed')
