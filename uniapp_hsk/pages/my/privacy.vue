<template>
	<view class="page">
		<scroll-view scroll-y class="content">
			<text class="text">{{ content }}</text>
            <text class="text">
运营统计说明：为改进浏览、预约和购物体验，我们记录随机访客标识、访问页面、可见停留时长、商品操作、入口渠道及必要的错误分类，并与预约和订单结果关联。统计事件不包含姓名、手机号、收货地址、聊天内容或支付凭证。
</text>
		</scroll-view>
	</view>
</template>

<script>
	import { api } from '@/utils/request.js'
	export default {
		data() {
			return {
				content: ''
			}
		},
		onLoad() {
			this.loadContent()
		},
		methods: {
			async loadContent() {
				try {
					const res = await api.news.detail({ code: 'service_agreement' })
					if (res.code === 200 && res.data) {
						this.content = res.data.content || ''
					}
				} catch (e) {
					uni.showToast({ title: '加载失败', icon: 'none' })
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
	.content {
		max-height: 100vh;
		padding: 30rpx;
		box-sizing: border-box;
	}
	.text {
		font-size: 28rpx;
		color: #333;
		line-height: 1.8;
		white-space: pre-wrap;
	}
</style>