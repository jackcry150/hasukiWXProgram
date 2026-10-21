<template>
	<view class="page">
		<view v-if="loading" class="state">隐私政策加载中…</view>
		<view v-else-if="loadError" class="state">
			<text>{{ loadError }}</text>
			<button class="retry" size="mini" @click="loadContent">重新加载</button>
		</view>
		<view v-else class="content">
			<text class="text">{{ content }}</text>
		</view>
	</view>
</template>

<script>
	import { api } from '@/utils/request.js'


	export default {
		data() {
			return {
				content: '',
				loading: true,
				loadError: ''
			}
		},
		onLoad() {
			this.loadContent()
		},
		methods: {
			async loadContent() {
				this.loading = true
				this.loadError = ''
				this.content = ''
				try {
					const res = await api.news.detail({ code: 'privacy_policy' })
					const body = res && res.code === 200 && res.data && typeof res.data.content === 'string'
						? res.data.content.trim() : ''
					const policyText = body.replace(/\s+/g, '').replace(/^运营统计说明[：:]?/, '')
					if (!policyText || policyText === '为改进浏览、预约和购物体验，我们记录随机访客标识、访问页面、可见停留时长、商品操作、入口渠道及必要的错误分类，并与预约和订单结果关联。统计事件不包含姓名、手机号、收货地址、聊天内容或支付凭证。') {
						this.loadError = '完整隐私政策暂不可用，请稍后重试。'
						return
					}
					this.content = body
				} catch (e) {
					this.loadError = '隐私政策加载失败，请检查网络后重试。'
				} finally {
					this.loading = false
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #ffffff;
	}
	.content,
	.state {
		padding: 30rpx;
		padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
	}
	.text,
	.state {
		font-size: 28rpx;
		color: #333;
		line-height: 1.8;
		white-space: pre-wrap;
	}
	.text {
		display: block;
	}
	.retry {
		display: block;
		margin-top: 24rpx;
	}
</style>
