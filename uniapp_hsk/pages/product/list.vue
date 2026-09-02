<template>
	<view class="product-list-page">
		<view class="page-glow page-glow-left"></view>
		<view class="page-glow page-glow-right"></view>

		<view class="page-shell">
			<view class="catalog-head">
				<view class="catalog-copy">
					<text class="catalog-brand">HASUKI COLLECTION</text>
					<text class="catalog-title">{{ activeCategory.title }}</text>
					<text class="catalog-desc">{{ activeCategory.description }}</text>
				</view>
				<text class="catalog-count">{{ catalogSummary }}</text>
			</view>

			<scroll-view
				class="category-scroll"
				scroll-x
				:show-scrollbar="false"
				aria-label="商品分类"
			>
				<view class="category-tabs">
					<view
						v-for="category in categoryOptions"
						:key="category.code || 'all'"
						:class="['category-tab', { 'category-tab--active': activeCategoryCode === category.code }]"
						hover-class="category-tab--pressed"
						:hover-stay-time="80"
						@click="changeCategory(category.code)"
					>
						{{ category.label }}
					</view>
				</view>
			</scroll-view>

			<view v-if="loading" class="product-grid" aria-label="商品加载中">
				<view v-for="item in skeletonItems" :key="item" class="product-card product-card--skeleton">
					<view class="skeleton-block skeleton-image"></view>
					<view class="product-body">
						<view class="skeleton-block skeleton-tag"></view>
						<view class="skeleton-block skeleton-title"></view>
						<view class="skeleton-block skeleton-copy"></view>
						<view class="skeleton-block skeleton-price"></view>
					</view>
				</view>
			</view>

			<view v-else-if="loadError" class="state-panel">
				<image class="state-image" src="/static/image/no-data.png" mode="aspectFit"></image>
				<text class="state-title">商品暂时没有加载出来</text>
				<text class="state-desc">请检查网络后重试，或下拉刷新页面。</text>
				<view class="state-action" hover-class="state-action--pressed" :hover-stay-time="80" @click="fetchProducts(true)">
					重新加载
				</view>
			</view>

			<view v-else-if="!displayProducts.length" class="state-panel">
				<image class="state-image" src="/static/image/no-data.png" mode="aspectFit"></image>
				<text class="state-title">{{ activeCategory.emptyTitle }}</text>
				<text class="state-desc">{{ activeCategory.emptyDescription }}</text>
			</view>

			<view v-else class="product-grid">
				<view
					v-for="(product, index) in displayProducts"
					:key="product.id || index"
					class="product-card"
					hover-class="product-card--pressed"
					:hover-stay-time="80"
					@click="goToProduct(product)"
				>
					<view class="product-image-wrap">
						<image class="product-image" :src="getProductImage(product)" mode="aspectFill" lazy-load></image>
						<text class="product-tag">{{ getCategoryName(product.category_code) }}</text>
						<view class="product-countdown" v-if="product.type == 2">限量预售</view>
					</view>
					<view class="product-body">
						<text class="product-name">{{ product.title || '新品系列' }}</text>
						<text class="product-desc">{{ product.subtitle || '更多商品信息请进入详情页查看' }}</text>
						<view class="product-meta">
							<text class="product-price">{{ getProductPrice(product) }}</text>
							<text class="product-detail-link">查看详情</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { api } from '@/utils/request.js'

const CATEGORY_OPTIONS = [
	{ code: '', label: '全部', title: '全部商品', description: '探索 HASUKI 可动人偶与造型系列', emptyTitle: '商品正在准备中', emptyDescription: '商品上架后会第一时间出现在这里。' },
	{ code: 'military', label: '军事', title: '军事系列', description: '战术主题、军事风格与收藏作品', emptyTitle: '军事系列正在上新', emptyDescription: '军事分类暂时没有商品，敬请期待。' },
	{ code: 'anime', label: '二次元', title: '二次元系列', description: '动画、游戏与潮流文化主题作品', emptyTitle: '二次元系列正在上新', emptyDescription: '二次元分类暂时没有商品，敬请期待。' },
	{ code: 'figure', label: '手办', title: '手办系列', description: '角色收藏、展示模型与限定作品', emptyTitle: '手办系列正在上新', emptyDescription: '手办分类暂时没有商品，敬请期待。' },
	{ code: 'accessory_pack', label: '配件包', title: '配件包系列', description: '替换部件、造型配件与组合套装', emptyTitle: '配件包系列正在上新', emptyDescription: '配件包分类暂时没有商品，敬请期待。' },
	{ code: 'clothing_pack', label: '服装包', title: '服装包系列', description: '完整造型、主题服饰与搭配套装', emptyTitle: '服装包系列正在上新', emptyDescription: '服装包分类暂时没有商品，敬请期待。' },
	{ code: 'doll_socks', label: '袜子', title: '袜子系列', description: '人偶袜装、腿部造型与穿搭单品', emptyTitle: '袜子系列正在上新', emptyDescription: '袜子分类暂时没有商品，敬请期待。' }
]

const CATEGORY_NAMES = {
	general: 'HASUKI',
	military: '军事',
	anime: '二次元',
	figure: '手办',
	accessory_pack: '配件包',
	clothing_pack: '服装包',
	doll_outfit: '娃衣',
	doll_socks: '袜子',
	doll_accessory: '配饰'
}

export default {
	data() {
		return {
			categoryOptions: CATEGORY_OPTIONS,
			activeCategoryCode: '',
			hotProducts: [],
			recommendedProducts: [],
			loading: true,
			loadError: false,
			requestSequence: 0,
			skeletonItems: [1, 2, 3, 4],
			placeholderImage: '/static/image/600_694.png'
		}
	},

	computed: {
		activeCategory() {
			return this.categoryOptions.find((category) => category.code === this.activeCategoryCode) || this.categoryOptions[0]
		},
		displayProducts() {
			const merged = [...this.hotProducts, ...this.recommendedProducts]
			const seen = new Set()
			return merged.filter((item) => {
				if (!item) return false
				const key = item.id !== undefined && item.id !== null
					? `id:${item.id}`
					: `fallback:${item.title || ''}:${item.price || ''}`
				if (seen.has(key)) return false
				seen.add(key)
				return true
			})
		},
		catalogSummary() {
			if (this.loading) return '加载中'
			if (this.loadError) return '加载失败'
			return `${this.displayProducts.length} 件`
		}
	},

	onLoad(options = {}) {
		this.activeCategoryCode = this.normalizeCategoryCode(options.category_code)
		this.updateNavigationTitle()
		this.fetchProducts(true)
	},

	onPullDownRefresh() {
		this.fetchProducts(false).finally(() => uni.stopPullDownRefresh())
	},

	onShareAppMessage() {
		return {
			title: this.activeCategoryCode ? `HASUKI ${this.activeCategory.title}` : 'HASUKI 全部商品',
			path: this.getSharePath()
		}
	},

	onShareTimeline() {
		return {
			title: this.activeCategoryCode ? `HASUKI ${this.activeCategory.title}` : 'HASUKI 全部商品',
			query: this.activeCategoryCode ? `category_code=${encodeURIComponent(this.activeCategoryCode)}` : ''
		}
	},

	methods: {
		normalizeCategoryCode(value) {
			if (typeof value !== 'string') return ''
			const normalized = value.trim().toLowerCase()
			return this.categoryOptions.some((category) => category.code === normalized) ? normalized : ''
		},

		changeCategory(categoryCode) {
			const normalized = this.normalizeCategoryCode(categoryCode)
			if (normalized === this.activeCategoryCode) return
			this.activeCategoryCode = normalized
			this.updateNavigationTitle()
			return this.fetchProducts(true)
		},

		updateNavigationTitle() {
			if (typeof uni === 'undefined' || typeof uni.setNavigationBarTitle !== 'function') return
			uni.setNavigationBarTitle({ title: this.activeCategory.title })
		},

		getSharePath() {
			return this.activeCategoryCode
				? `/pages/product/list?category_code=${encodeURIComponent(this.activeCategoryCode)}`
				: '/pages/product/list'
		},

		async fetchProducts(showLoading = true) {
			const sequence = ++this.requestSequence
			const categoryCode = this.activeCategoryCode
			const params = categoryCode ? { category_code: categoryCode } : undefined
			if (showLoading) this.loading = true
			this.loadError = false

			try {
				const response = await api.product.list(params)
				if (sequence !== this.requestSequence) return
				if (!response || response.code !== 200 || !response.data) {
					throw new Error((response && response.msg) || '商品加载失败')
				}

				const hot = Array.isArray(response.data.hot) ? response.data.hot : []
				const recommended = Array.isArray(response.data.recom) ? response.data.recom : []
				this.hotProducts = this.filterCategoryProducts(hot, categoryCode)
				this.recommendedProducts = this.filterCategoryProducts(recommended, categoryCode)
			} catch (error) {
				if (sequence !== this.requestSequence) return
				console.error('fetch products error', error)
				this.hotProducts = []
				this.recommendedProducts = []
				this.loadError = true
			} finally {
				if (sequence === this.requestSequence) this.loading = false
			}
		},

		filterCategoryProducts(products, categoryCode) {
			if (!categoryCode) return products.filter(Boolean)
			return products.filter((product) => {
				if (!product) return false
				return String(product.category_code || '').trim().toLowerCase() === categoryCode
			})
		},

		getCategoryName(categoryCode) {
			return CATEGORY_NAMES[categoryCode] || 'HASUKI'
		},

		getProductImage(product) {
			if (!product) return this.placeholderImage
			if (Array.isArray(product.image)) return product.image[0] || this.placeholderImage
			if (typeof product.image === 'string') {
				const image = product.image.trim()
				if (!image) return this.placeholderImage
				if (image.startsWith('[')) {
					try {
						const images = JSON.parse(image)
						return Array.isArray(images) && images[0] ? images[0] : this.placeholderImage
					} catch (error) {
						return this.placeholderImage
					}
				}
				return image
			}
			return this.placeholderImage
		},

		getProductPrice(product) {
			if (!product) return '¥0.00'
			if (product.type == 2 && Number(product.deposit) > 0) {
				return `定金 ¥${Number(product.deposit).toFixed(2)}`
			}
			return `¥${Number(product.price || 0).toFixed(2)}`
		},

		goToProduct(product) {
			if (!product || !product.id) {
				uni.showToast({ title: '商品信息正在更新', icon: 'none' })
				return
			}
			uni.navigateTo({ url: `/pages/product/detail?id=${product.id}` })
		}
	}
}
</script>

<style scoped>
.product-list-page {
	position: relative;
	min-height: 100vh;
	overflow: hidden;
	background:
		radial-gradient(circle at top left, rgba(255, 255, 255, 0.5), transparent 28%),
		radial-gradient(circle at top right, rgba(210, 210, 210, 0.34), transparent 24%),
		linear-gradient(180deg, #f1f1f1 0%, #f7f7f7 34%, #ffffff 100%);
	color: #141414;
}

.page-glow {
	position: absolute;
	border-radius: 999rpx;
	filter: blur(50rpx);
	opacity: 0.42;
	pointer-events: none;
}

.page-glow-left { width: 240rpx; height: 240rpx; top: 40rpx; left: -80rpx; background: rgba(255, 255, 255, 0.56); }
.page-glow-right { width: 220rpx; height: 220rpx; top: 220rpx; right: -70rpx; background: rgba(190, 190, 190, 0.38); }
.page-shell { position: relative; z-index: 1; padding: 28rpx 24rpx calc(48rpx + env(safe-area-inset-bottom)); }

.catalog-head {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 26rpx;
}

.catalog-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; }
.catalog-brand { margin-bottom: 10rpx; font-size: 20rpx; line-height: 1.2; font-weight: 700; letter-spacing: 2rpx; color: #4f4f4f; }
.catalog-title { margin-bottom: 10rpx; font-size: 46rpx; line-height: 1.2; font-weight: 900; color: #111111; }
.catalog-desc { font-size: 25rpx; line-height: 1.5; color: #595959; }

.catalog-count {
	flex: 0 0 auto;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: #111111;
	font-size: 23rpx;
	line-height: 1.35;
	font-weight: 700;
	color: #ffffff;
}

.category-scroll { width: calc(100% + 24rpx); margin: 0 -24rpx 30rpx 0; white-space: nowrap; }
.category-tabs { display: inline-flex; gap: 12rpx; padding: 2rpx 24rpx 10rpx 0; }

.category-tab {
	min-height: 74rpx;
	box-sizing: border-box;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 28rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.07);
	font-size: 26rpx;
	line-height: 1.35;
	font-weight: 700;
	color: #4d4d4d;
	transition: transform 180ms ease, opacity 180ms ease, background-color 180ms ease, color 180ms ease;
}

.category-tab--active { background: #111111; color: #ffffff; }
.category-tab--pressed { transform: scale(0.97); opacity: 0.88; }
.product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20rpx; }

.product-card {
	overflow: hidden;
	border-radius: 30rpx;
	background: rgba(255, 255, 255, 0.94);
	box-shadow: 0 12rpx 16rpx rgba(0, 0, 0, 0.08);
	transition: transform 180ms ease, opacity 180ms ease;
}

.product-card--pressed { transform: scale(0.985); opacity: 0.92; }
.product-image-wrap { position: relative; height: 340rpx; background: linear-gradient(180deg, #efefef 0%, #dcdcdc 100%); }
.product-image { width: 100%; height: 100%; }

.product-tag {
	position: absolute;
	left: 16rpx;
	top: 16rpx;
	max-width: calc(100% - 32rpx);
	box-sizing: border-box;
	padding: 8rpx 16rpx;
	border-radius: 14rpx;
	background: rgba(17, 17, 17, 0.82);
	font-size: 22rpx;
	line-height: 1.2;
	font-weight: 800;
	color: #ffffff;
}

.product-countdown {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 24rpx 16rpx 12rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #ffffff;
	text-align: center;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.62));
}

.product-body { padding: 22rpx 20rpx 24rpx; }
.product-name { display: -webkit-box; overflow: hidden; margin-bottom: 10rpx; min-height: 80rpx; font-size: 32rpx; line-height: 1.25; font-weight: 800; color: #171717; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-desc { display: -webkit-box; overflow: hidden; margin-bottom: 20rpx; min-height: 68rpx; font-size: 25rpx; line-height: 1.35; color: #5f5f5f; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-meta { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.product-price { font-size: 28rpx; line-height: 1.2; font-weight: 900; color: #111111; font-variant-numeric: tabular-nums; }
.product-detail-link { flex: 0 0 auto; font-size: 22rpx; line-height: 1.3; font-weight: 700; color: #555555; }

.state-panel {
	min-height: 560rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 48rpx 32rpx;
	box-sizing: border-box;
	text-align: center;
}

.state-image { width: 190rpx; height: 190rpx; margin-bottom: 20rpx; }
.state-title { margin-bottom: 12rpx; font-size: 32rpx; line-height: 1.45; font-weight: 800; color: #1b1b1b; }
.state-desc { max-width: 24em; font-size: 26rpx; line-height: 1.55; color: #595959; }

.state-action {
	min-width: 220rpx;
	min-height: 78rpx;
	margin-top: 28rpx;
	padding: 0 32rpx;
	box-sizing: border-box;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #111111;
	font-size: 27rpx;
	font-weight: 700;
	color: #ffffff;
	transition: transform 180ms ease, opacity 180ms ease;
}

.state-action--pressed { transform: scale(0.97); opacity: 0.88; }
.product-card--skeleton { box-shadow: none; }

.skeleton-block {
	background: linear-gradient(90deg, #e3e3e3 20%, #f4f4f4 38%, #e3e3e3 56%);
	background-size: 220% 100%;
	animation: skeleton-loading 1.2s ease-in-out infinite;
}

.skeleton-image { height: 340rpx; }
.skeleton-tag { width: 34%; height: 24rpx; margin-bottom: 14rpx; border-radius: 8rpx; }
.skeleton-title { width: 84%; height: 72rpx; margin-bottom: 12rpx; border-radius: 8rpx; }
.skeleton-copy { width: 100%; height: 60rpx; margin-bottom: 18rpx; border-radius: 8rpx; }
.skeleton-price { width: 46%; height: 34rpx; border-radius: 8rpx; }

@keyframes skeleton-loading {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}

@media (max-width: 360px) {
	.product-image-wrap, .skeleton-image { height: 320rpx; }
	.product-body { padding: 20rpx 16rpx 22rpx; }
	.product-meta { align-items: flex-start; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
	.category-tab, .product-card, .state-action { transition: none; }
	.skeleton-block { animation: none; }
}
</style>
