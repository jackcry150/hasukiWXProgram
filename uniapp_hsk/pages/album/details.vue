<template>
	<view class="album-detail">
		<view v-if="isLoading" class="detail-loading" aria-label="图册详情加载中">
			<view class="detail-loading__image"></view>
			<view class="detail-loading__panel">
				<view class="detail-loading__line detail-loading__line--title"></view>
				<view class="detail-loading__line"></view>
				<view class="detail-loading__line detail-loading__line--short"></view>
			</view>
		</view>

		<template v-else-if="hasAlbumData">
			<view class="album-hero">
				<image
					v-if="albumInfo.image"
					:src="albumInfo.image"
					class="album-hero__image"
					mode="aspectFill"
					@click="previewCover"
				></image>
				<view v-else class="album-hero__placeholder"><text>暂无封面图片</text></view>
				<view v-if="albumInfo.image" class="album-hero__shade"></view>
				<view class="album-hero__topline">
					<text v-if="badgeText" class="album-hero__badge">{{ badgeText }}</text>
					<view
						v-if="galleryImages.length"
						class="album-hero__count"
						@click="switchGroup(4)"
					>
						<view class="album-hero__count-icon">
							<view class="album-hero__count-card album-hero__count-card--back"></view>
							<view class="album-hero__count-card"></view>
						</view>
						<text>{{ galleryImages.length }} 张</text>
					</view>
				</view>
				<view v-if="albumInfo.image" class="album-hero__preview" @click="previewCover">
					<view class="album-hero__preview-icon"></view>
					<text>查看大图</text>
				</view>
			</view>

			<view class="album-sheet">
				<view class="album-heading">
					<text class="album-heading__title">{{ albumInfo.title || '图册详情' }}</text>
					<text v-if="albumInfo.subtitle" class="album-heading__subtitle">{{ albumInfo.subtitle }}</text>
					<view v-if="visibleLabels.length" class="album-heading__tags">
						<text v-for="(label, index) in visibleLabels" :key="index" class="album-heading__tag">{{ label }}</text>
					</view>
				</view>

				<scroll-view class="album-tabs-scroll" scroll-x enable-flex show-scrollbar="false">
					<view class="album-tabs">
						<view
							v-for="tab in tabs"
							:key="tab.key"
							class="album-tab"
							:class="{ 'is-active': groupItem === tab.key }"
							@click="switchGroup(tab.key)"
						>{{ tab.label }}</view>
					</view>
				</scroll-view>

				<view class="album-content">
					<view v-if="groupItem === 1" class="album-overview">
						<text class="content-title">系列概览</text>
						<text class="album-overview__text">{{ overviewText }}</text>
						<view v-if="visibleLabels.length" class="overview-list">
							<view v-for="(label, index) in visibleLabels" :key="`overview-${index}`" class="overview-list__item">
								<view class="overview-list__dot"></view>
								<text>{{ label }}</text>
							</view>
						</view>
					</view>

					<view v-else-if="groupItem === 2" class="album-specs">
						<text class="content-title">产品信息</text>
						<view v-if="productSpecs.length" class="spec-list">
							<view v-for="spec in productSpecs" :key="spec.label" class="spec-row">
								<text class="spec-row__label">{{ spec.label }}</text>
								<text class="spec-row__value">{{ spec.value }}</text>
							</view>
						</view>
						<view v-else class="content-empty">产品信息整理中</view>
					</view>

					<view v-else-if="groupItem === 3" class="album-accessories">
						<text class="content-title">内容物及配件</text>
						<view v-if="contentItems.length" class="accessory-list">
							<view v-for="(item, index) in contentItems" :key="index" class="accessory-row">
								<text class="accessory-row__index">{{ index + 1 }}</text>
								<text class="accessory-row__text">{{ item }}</text>
							</view>
						</view>
						<view v-else class="content-empty">内容清单整理中</view>
					</view>

					<view v-else class="album-gallery">
						<view class="gallery-heading">
							<text class="content-title">产品图册</text>
							<text v-if="galleryImages.length" class="gallery-heading__count">共 {{ galleryImages.length }} 张</text>
						</view>
						<view v-if="galleryImages.length" class="gallery-grid">
							<view
								v-for="(image, index) in galleryImages"
								:key="`${image}-${index}`"
								class="gallery-item"
								:class="{ 'gallery-item--featured': index === 0 }"
								@click="viewImage(index)"
							>
								<image class="gallery-item__image" :src="image" mode="aspectFill"></image>
								<text class="gallery-item__index">{{ index + 1 }}</text>
							</view>
						</view>
						<view v-else class="content-empty">图册图片整理中</view>
					</view>
				</view>
			</view>
		</template>

		<view v-else class="detail-error">
			<image class="detail-error__image" src="/static/image/no-data.png" mode="aspectFit"></image>
			<text class="detail-error__title">{{ errorTitle }}</text>
			<text class="detail-error__desc">{{ errorDescription }}</text>
			<view class="detail-error__action" @click="handleErrorAction">{{ errorActionText }}</view>
		</view>
	</view>
</template>

<script>
	import { api } from '@/utils/request.js'

	export default {
		data() {
			return {
				albumId: '',
				albumInfo: {},
				groupItem: 1,
				isLoading: true,
				loadError: false,
				tabs: [
					{ key: 1, label: '系列介绍' },
					{ key: 2, label: '产品信息' },
					{ key: 3, label: '内容物' },
					{ key: 4, label: '产品图册' },
				],
			}
		},

		computed: {
			hasAlbumData() {
				return Boolean(this.albumInfo && Object.keys(this.albumInfo).length)
			},

			visibleLabels() {
				return Array.isArray(this.albumInfo.labels) ? this.albumInfo.labels.filter(Boolean).slice(0, 6) : []
			},

			badgeText() {
				if (this.albumInfo.badge) return this.albumInfo.badge
				return Number(this.albumInfo.type) === 2 ? '预售' : ''
			},

			overviewText() {
				return this.albumInfo.description || this.albumInfo.subtitle || '查看本系列的产品信息、内容物与完整图片。'
			},

			productSpecs() {
				return [
					{ label: '比例', value: this.albumInfo.proportion },
					{ label: '尺寸', value: this.albumInfo.size },
					{ label: '材质', value: this.albumInfo.material },
					{ label: '版权所属', value: this.albumInfo.copyright },
					{ label: '售价', value: this.albumInfo.price },
				].filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
			},

			contentItems() {
				if (Array.isArray(this.albumInfo.content)) return this.albumInfo.content.filter(Boolean)
				if (typeof this.albumInfo.content === 'string' && this.albumInfo.content.trim()) {
					return this.albumInfo.content
						.split(/\r?\n|[、,，]/)
						.map((item) => item.trim())
						.filter(Boolean)
				}
				return []
			},

			galleryImages() {
				return Array.isArray(this.albumInfo.images) ? this.albumInfo.images.filter(Boolean) : []
			},

			errorTitle() {
				return this.loadError ? '图册详情加载失败' : '暂未找到这份图册'
			},

			errorDescription() {
				return this.loadError ? '请检查网络后重新尝试' : '内容可能已调整，返回图册列表看看吧'
			},

			errorActionText() {
				return this.loadError ? '重新加载' : '返回图册'
			},
		},

		onLoad(options) {
			if (!options.id) {
				uni.redirectTo({ url: '/pages/album/index' })
				return
			}
			this.albumId = options.id
			this.getAlbumDetails(options.id)
		},

		methods: {
			async getAlbumDetails(id) {
				this.isLoading = true
				this.loadError = false
				try {
					const response = await api.album.detail({ id })
					this.albumInfo = response && response.data ? response.data : {}
					if (this.albumInfo.title) uni.setNavigationBarTitle({ title: '图册详情' })
				} catch (error) {
					this.albumInfo = {}
					this.loadError = true
				} finally {
					this.isLoading = false
				}
			},

			handleErrorAction() {
				if (this.loadError && this.albumId) {
					this.getAlbumDetails(this.albumId)
					return
				}
				uni.redirectTo({ url: '/pages/album/index' })
			},

			switchGroup(item) {
				this.groupItem = item
			},

			previewCover() {
				if (!this.albumInfo.image) return
				const urls = [this.albumInfo.image, ...this.galleryImages]
					.filter((url, index, list) => url && list.indexOf(url) === index)
				uni.previewImage({ current: this.albumInfo.image, urls })
			},

			viewImage(index) {
				if (!this.galleryImages.length) return
				uni.previewImage({ current: this.galleryImages[index], urls: this.galleryImages })
			},
		},
	}
</script>

<style scoped>
	.album-detail { min-height: 100vh; padding-bottom: env(safe-area-inset-bottom); background: #f2f3f5; }
	.album-hero { position: relative; width: 100%; height: 900rpx; overflow: hidden; background: #dfe1e4; }
	.album-hero__image { display: block; width: 100%; height: 100%; }
	.album-hero__placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #555960; font-size: 26rpx; }
	.album-hero__shade { position: absolute; right: 0; bottom: 0; left: 0; height: 280rpx; background: linear-gradient(180deg, rgba(10, 11, 13, 0) 0%, rgba(10, 11, 13, 0.58) 100%); pointer-events: none; }
	.album-hero__topline { position: absolute; top: 24rpx; right: 24rpx; left: 24rpx; display: flex; align-items: center; justify-content: space-between; }
	.album-hero__badge { padding: 11rpx 18rpx; border-radius: 999rpx; background: rgba(12, 13, 15, 0.86); color: #ffffff; font-size: 22rpx; font-weight: 700; line-height: 1; }
	.album-hero__count { display: flex; align-items: center; margin-left: auto; min-height: 56rpx; padding: 0 18rpx; border-radius: 999rpx; background: rgba(12, 13, 15, 0.78); color: #ffffff; font-size: 22rpx; font-weight: 700; }
	.album-hero__count-icon { position: relative; width: 28rpx; height: 24rpx; margin-right: 10rpx; }
	.album-hero__count-card { position: absolute; right: 0; bottom: 0; width: 19rpx; height: 15rpx; border: 2rpx solid rgba(255, 255, 255, 0.96); border-radius: 3rpx; box-sizing: border-box; }
	.album-hero__count-card--back { top: 0; right: auto; bottom: auto; left: 0; opacity: 0.62; }
	.album-hero__preview { position: absolute; right: 24rpx; bottom: 56rpx; display: flex; align-items: center; min-height: 60rpx; padding: 0 20rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.92); color: #17181b; font-size: 23rpx; font-weight: 700; }
	.album-hero__preview-icon { position: relative; width: 22rpx; height: 22rpx; margin-right: 12rpx; border: 3rpx solid #17181b; border-radius: 50%; box-sizing: border-box; }
	.album-hero__preview-icon::after { position: absolute; right: -7rpx; bottom: -5rpx; width: 8rpx; height: 3rpx; border-radius: 999rpx; background: #17181b; content: ''; transform: rotate(45deg); }
	.album-sheet { position: relative; z-index: 1; margin-top: -28rpx; overflow: hidden; border-radius: 28rpx 28rpx 0 0; background: #ffffff; box-shadow: 0 -10rpx 28rpx rgba(15, 16, 18, 0.08); }
	.album-heading { padding: 40rpx 30rpx 30rpx; }
	.album-heading__title { display: block; color: #111214; font-size: 38rpx; font-weight: 800; line-height: 1.4; }
	.album-heading__subtitle { display: block; margin-top: 12rpx; color: #50545b; font-size: 25rpx; line-height: 1.65; }
	.album-heading__tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 22rpx; }
	.album-heading__tag { padding: 10rpx 17rpx; border-radius: 999rpx; background: #eceef1; color: #292c31; font-size: 22rpx; line-height: 1; }
	.album-tabs-scroll { position: sticky; top: 0; z-index: 3; width: 100%; border-top: 2rpx solid #e8e9eb; border-bottom: 2rpx solid #e8e9eb; background: #ffffff; white-space: nowrap; }
	.album-tabs { display: inline-flex; min-width: 100%; padding: 0 16rpx; box-sizing: border-box; }
	.album-tab { position: relative; display: flex; flex: 1; flex-shrink: 0; align-items: center; justify-content: center; min-width: 160rpx; height: 92rpx; padding: 0 14rpx; box-sizing: border-box; color: #6a6d73; font-size: 24rpx; font-weight: 600; }
	.album-tab.is-active { color: #111214; font-weight: 800; }
	.album-tab.is-active::after { position: absolute; right: 26rpx; bottom: 0; left: 26rpx; height: 6rpx; border-radius: 999rpx 999rpx 0 0; background: #111214; content: ''; }
	.album-content { min-height: 360rpx; padding: 34rpx 28rpx 64rpx; }
	.content-title { display: block; margin-bottom: 24rpx; color: #202226; font-size: 30rpx; font-weight: 700; line-height: 1.3; }
	.album-overview__text { display: block; color: #4f5359; font-size: 26rpx; line-height: 1.75; }
	.overview-list { margin-top: 28rpx; }
	.overview-list__item { display: flex; align-items: center; min-height: 58rpx; color: #35383d; font-size: 25rpx; }
	.overview-list__dot { flex-shrink: 0; width: 10rpx; height: 10rpx; margin-right: 18rpx; border-radius: 50%; background: #24262a; }
	.spec-list, .accessory-list { border-top: 2rpx solid #e8e9eb; }
	.spec-row { display: flex; align-items: flex-start; min-height: 92rpx; padding: 24rpx 0; box-sizing: border-box; border-bottom: 2rpx solid #e8e9eb; }
	.spec-row__label { flex-shrink: 0; width: 180rpx; color: #6a6d73; font-size: 25rpx; line-height: 1.55; }
	.spec-row__value { flex: 1; color: #202226; font-size: 25rpx; font-weight: 600; line-height: 1.55; text-align: right; word-break: break-all; }
	.accessory-row { display: flex; align-items: center; min-height: 86rpx; padding: 18rpx 0; box-sizing: border-box; border-bottom: 2rpx solid #e8e9eb; }
	.accessory-row__index { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 44rpx; height: 44rpx; margin-right: 18rpx; border-radius: 50%; background: #232529; color: #ffffff; font-size: 21rpx; font-weight: 700; }
	.accessory-row__text { flex: 1; color: #303238; font-size: 25rpx; line-height: 1.55; }
	.gallery-heading { display: flex; align-items: center; justify-content: space-between; }
	.gallery-heading .content-title, .gallery-heading__count { margin-bottom: 24rpx; }
	.gallery-heading__count { color: #6a6d73; font-size: 22rpx; }
	.gallery-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
	.gallery-item { position: relative; width: calc((100% - 12rpx) / 2); height: 320rpx; overflow: hidden; border-radius: 20rpx; background: #e4e5e7; }
	.gallery-item--featured { width: 100%; height: 560rpx; }
	.gallery-item__image { display: block; width: 100%; height: 100%; }
	.gallery-item__index { position: absolute; right: 12rpx; bottom: 12rpx; display: flex; align-items: center; justify-content: center; width: 44rpx; height: 44rpx; border-radius: 50%; background: rgba(15, 16, 18, 0.76); color: #ffffff; font-size: 20rpx; font-weight: 700; }
	.content-empty { display: flex; align-items: center; justify-content: center; min-height: 240rpx; color: #62656b; font-size: 25rpx; }
	.detail-loading__image { width: 100%; height: 900rpx; background: #dedfe2; }
	.detail-loading__panel { position: relative; z-index: 1; margin-top: -28rpx; padding: 58rpx 30rpx 80rpx; border-radius: 28rpx 28rpx 0 0; background: #ffffff; }
	.detail-loading__line { width: 74%; height: 26rpx; margin-top: 22rpx; border-radius: 8rpx; background: #e5e6e8; }
	.detail-loading__line--title { width: 88%; height: 40rpx; margin-top: 0; }
	.detail-loading__line--short { width: 48%; }
	.detail-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 80rpx 48rpx; box-sizing: border-box; text-align: center; }
	.detail-error__image { width: 270rpx; height: 220rpx; margin-bottom: 26rpx; opacity: 0.72; }
	.detail-error__title { color: #202226; font-size: 32rpx; font-weight: 700; }
	.detail-error__desc { margin-top: 12rpx; color: #62656b; font-size: 24rpx; }
	.detail-error__action { display: flex; align-items: center; justify-content: center; min-width: 200rpx; height: 72rpx; margin-top: 30rpx; padding: 0 28rpx; border-radius: 999rpx; background: #17181b; color: #ffffff; font-size: 26rpx; font-weight: 700; }
</style>
