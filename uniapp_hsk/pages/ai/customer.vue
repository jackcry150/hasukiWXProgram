<template>
	<view class="ai-customer-page">
		<view class="page-shell">
			<view class="brand-head">
				<view class="brand-lockup" @click="goBack">
					<image class="brand-logo" src="/static/image/default_avatar.jpg" mode="aspectFit"></image>
					<view class="brand-copy">
						<text class="brand-en">HASUKI</text>
					</view>
				</view>
			</view>

			<view class="hero-card">
				<view class="hero-copy">
					<text class="hero-title">AI 客服小橘</text>
					<text class="hero-subtitle">24 小时为您服务</text>
					<view class="online-pill">
						<text class="online-dot"></text>
						<text>在线</text>
					</view>
				</view>
				<text class="paw paw-one">●●●</text>
				<text class="paw paw-two">●●●</text>
				<image class="hero-character" src="/static/image/ai-xiaoju.png" mode="aspectFill"></image>
			</view>

			<scroll-view class="chat-scroll" scroll-y :scroll-into-view="scrollIntoView">
				<view class="chat-inner">
					<view class="ai-notice">本服务为AI生成内容，结果仅供参考</view>
					<view
						v-for="(item, index) in messages"
						:id="'msg-' + index"
						:key="index"
						:class="['message-row', item.role === 'user' ? 'message-row-user' : 'message-row-ai']"
					>
						<view v-if="item.role !== 'user'" class="ai-avatar-wrap">
							<image class="ai-avatar" src="/static/image/ai-xiaoju-avatar.png" mode="aspectFill"></image>
						</view>
						<view class="message-main">
							<view :class="['speaker-line', item.role === 'user' ? 'speaker-line-user' : '']">
								<text>{{ item.role === 'user' ? '我' : '小橘' }}</text>
								<text v-if="item.role !== 'user'" class="ai-tag">AI</text>
							</view>
							<view :class="['bubble', item.role === 'user' ? 'bubble-user' : 'bubble-ai']">
								<text class="bubble-text">{{ item.content }}</text>
								<view v-if="item.role !== 'user' && showOrderAction(item.content)" class="order-action" @click="goToOrders">
									<text>查看我的订单</text>
									<text class="action-arrow">›</text>
								</view>
							</view>
						</view>
						<view v-if="item.role === 'user'" class="user-avatar-wrap">
							<view class="user-avatar"></view>
							<text class="user-label">我</text>
						</view>
					</view>
				</view>
			</scroll-view>

			<view class="question-panel">
				<view class="question-head">
					<text class="question-title">猜你想问</text>
					<view class="refresh-btn" @click="refreshQuestions">
						<text>换一换</text>
						<text class="refresh-icon">↻</text>
					</view>
				</view>
				<view class="question-grid">
					<view data-eventsync="true"
						v-for="(item, index) in quickCards"
						:key="'quick-' + index"
						class="question-card"
						@click="handleQuickCard(item)"
					>
						<image data-eventsync="true" class="question-icon" :src="item.icon" mode="aspectFit"></image>
						<text data-eventsync="true" class="question-label">{{ item.label }}</text>
						<text data-eventsync="true" class="question-arrow">›</text>
					</view>
				</view>
			</view>
		</view>

		<view class="composer">
			<input
				v-model="draftQuestion"
				class="composer-input"
				maxlength="300"
				placeholder="请输入您的问题..."
				placeholder-class="composer-placeholder"
				confirm-type="send"
				@confirm="sendMessage"
			/>
			<view :class="['send-btn', sending ? 'send-btn-disabled' : '']" @click="sendMessage">
				<text class="send-icon">➤</text>
			</view>
		</view>

		<view class="mock-tabbar">
			<view class="mock-tabbar-item" @click="switchTab('/pages/index/index')">
				<image class="tabbar-icon" src="/static/image/icon_home.png" mode="aspectFit"></image>
				<text>首页</text>
			</view>
			<view class="mock-tabbar-item" @click="switchTab('/pages/album/index')">
				<image class="tabbar-icon" src="/static/image/icon_album.png" mode="aspectFit"></image>
				<text>图册</text>
			</view>
			<view class="mock-tabbar-item" @click="switchTab('/pages/verify/index')">
				<image class="tabbar-icon" src="/static/image/icon_verify.png" mode="aspectFit"></image>
				<text>校验</text>
			</view>
			<view class="mock-tabbar-item" @click="switchTab('/pages/my/index')">
				<image class="tabbar-icon" src="/static/image/icon_my.png" mode="aspectFit"></image>
				<text>我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { openCustomerService } from '@/utils/customer-service.js'
import { api } from '@/utils/request.js'

const QUICK_QUESTIONS = {
	presale: [
		'我的订单什么时候发货？',
		'预售商品一般多久发货？',
		'定金和尾款怎么支付？',
		'可以修改收货地址吗？',
		'请帮我介绍这个商品。',
		'请帮我转人工客服。'
	],
	aftersale: [
		'我的订单现在是什么状态？',
		'怎么申请退款？',
		'退款进度在哪里看？',
		'物流一直没更新怎么办？',
		'签收后发现问题怎么办？',
		'请帮我转人工客服。'
	]
}

const QUICK_CARD_META = [
	{ label: '订单相关问题', icon: '/static/image/dingdan.png' },
	{ label: '发货与物流', icon: '/static/image/icon_shipped.png' },
	{ label: '售后与退款', icon: '/static/image/shouhou.png' },
	{ label: '其他问题', icon: '/static/image/icon_question.png' }
]

export default {
	data() {
		return {
			scene: 'presale',
			productId: '',
			orderId: '',
			sourcePage: '',
			draftQuestion: '',
			sending: false,
			messages: [],
			questionOffset: 0,
			scrollIntoView: ''
		}
	},
	computed: {
		welcomeText() {
			if (this.scene === 'aftersale') {
				return '你好呀！我是小橘，很高兴为您服务～\n请问有什么售后、退款或物流问题需要帮助吗？'
			}
			return '你好呀！我是小橘，很高兴为您服务～\n请问有什么可以帮助您的吗？'
		},
		quickQuestions() {
			return QUICK_QUESTIONS[this.scene] || QUICK_QUESTIONS.presale
		},
		quickCards() {
			return QUICK_CARD_META.map((item, index) => {
				const questionIndex = (this.questionOffset + index) % this.quickQuestions.length
				return {
					...item,
					question: this.quickQuestions[questionIndex]
				}
			})
		}
	},
	onLoad(options) {
		this.scene = options.scene === 'aftersale' ? 'aftersale' : 'presale'
		this.productId = options.productId || ''
		this.orderId = options.orderId || ''
		this.sourcePage = options.sourcePage || ''
		this.messages = [
			{
				role: 'ai',
				content: this.welcomeText
			}
		]
		this.scrollToBottom()
	},
	methods: {
		goBack() {
			uni.navigateBack({
				fail: () => {
					uni.switchTab({ url: '/pages/index/index' })
				}
			})
		},
		switchTab(url) {
			uni.switchTab({ url })
		},
		scrollToBottom() {
			this.$nextTick(() => {
				if (!this.messages.length) return
				this.scrollIntoView = 'msg-' + (this.messages.length - 1)
			})
		},
		handleQuickCard(item) {
			if (item.question === '请帮我转人工客服。') {
				this.goToManualCustomer()
				return
			}
			this.draftQuestion = item.question
		},
		refreshQuestions() {
			this.questionOffset = (this.questionOffset + 1) % this.quickQuestions.length
		},
		showOrderAction(content) {
			return /订单|发货|物流|状态/.test(content)
		},
		async sendMessage() {
			if (this.sending) return
			if (!this.draftQuestion.trim()) {
				uni.showToast({ title: '请先输入问题', icon: 'none' })
				return
			}

			const content = this.draftQuestion.trim()
			this.messages.push({ role: 'user', content })
			this.draftQuestion = ''
			this.sending = true
			this.scrollToBottom()

			try {
				const res = await api.aiService.sendMessage({
					scene: this.scene,
					productId: this.productId,
					orderId: this.orderId,
					sourcePage: this.sourcePage,
					content
				})
				let replyText = res && res.data && res.data.reply ? res.data.reply : '您可以在「我的订单」中查看订单状态，一般在预定截止后 7 个工作日内发货哦～'
				if (res && res.data && res.data.needTransfer) {
					replyText += '\n\n建议：当前问题建议直接转人工客服处理。'
				}
				this.messages.push({ role: 'ai', content: replyText })
			} catch (error) {
				this.messages.push({ role: 'ai', content: '请求失败了，您可以换个说法继续提问，或者直接转人工客服。' })
			} finally {
				this.sending = false
				this.scrollToBottom()
			}
		},
		goToOrders() {
			uni.navigateTo({ url: '/pages/order/list' })
		},
		goToManualCustomer() {
			openCustomerService()
		}
	}
}
</script>

<style scoped>
	.ai-customer-page {
		min-height: 100vh;
		background: linear-gradient(180deg, #fbfbfb 0%, #f3f3f3 58%, #ffffff 100%);
		box-sizing: border-box;
		padding-bottom: calc(284rpx + env(safe-area-inset-bottom));
		color: #111111;
	}
	.page-shell {
		padding: calc(var(--status-bar-height) + 34rpx) 34rpx 0;
		box-sizing: border-box;
	}
	.brand-head {
		height: 94rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28rpx;
	}
	.brand-lockup {
		display: flex;
		align-items: center;
		min-width: 0;
	}
	.brand-logo {
		width: 78rpx;
		height: 78rpx;
		border-radius: 18rpx;
		margin-right: 22rpx;
	}
	.brand-copy {
		display: flex;
		flex-direction: column;
	}
	.brand-en {
		font-size: 40rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
		line-height: 1.1;
	}
	.hero-card {
		position: relative;
		height: 226rpx;
		border-radius: 34rpx;
		background: linear-gradient(102deg, #ffffff 0%, #fbfbfb 57%, #fff2df 100%);
		border: 6rpx solid rgba(255, 255, 255, 0.96);
		box-shadow: 0 20rpx 52rpx rgba(0, 0, 0, 0.08);
		overflow: hidden;
		margin-bottom: 30rpx;
	}
	.hero-copy {
		position: relative;
		z-index: 2;
		padding: 44rpx 0 0 34rpx;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.hero-title {
		font-size: 42rpx;
		font-weight: 800;
		line-height: 1.16;
	}
	.hero-subtitle {
		margin-top: 18rpx;
		font-size: 28rpx;
		color: #777777;
	}
	.online-pill {
		margin-top: 18rpx;
		height: 44rpx;
		padding: 0 18rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.9);
		border: 2rpx solid #e7e7e7;
		display: flex;
		align-items: center;
		gap: 10rpx;
		font-size: 24rpx;
		color: #333333;
	}
	.online-dot {
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		background: #28c48c;
	}
	.hero-character {
		position: absolute;
		right: -2rpx;
		bottom: -18rpx;
		width: 372rpx;
		height: 248rpx;
		z-index: 1;
	}
	.paw {
		position: absolute;
		color: rgba(0, 0, 0, 0.06);
		font-size: 32rpx;
		letter-spacing: 8rpx;
		transform: rotate(-18deg);
	}
	.paw-one {
		left: 370rpx;
		top: 36rpx;
	}
	.paw-two {
		left: 246rpx;
		bottom: 34rpx;
	}
	.chat-scroll {
		height: 548rpx;
	}
	.chat-inner {
		padding: 4rpx 4rpx 20rpx;
		box-sizing: border-box;
	}
	.ai-notice {
		margin-bottom: 24rpx;
		padding: 18rpx 22rpx;
		border-radius: 18rpx;
		background: rgba(255, 247, 224, 0.98);
		border: 2rpx solid rgba(241, 140, 0, 0.36);
		color: #8a5200;
		font-size: 24rpx;
		line-height: 1.5;
		text-align: center;
		box-shadow: 0 10rpx 24rpx rgba(255, 157, 0, 0.1);
	}
	.message-row {
		display: flex;
		margin-bottom: 30rpx;
	}
	.message-row-ai {
		justify-content: flex-start;
	}
	.message-row-user {
		justify-content: flex-end;
		align-items: flex-start;
	}
	.ai-avatar-wrap {
		width: 76rpx;
		margin-right: 18rpx;
		padding-top: 10rpx;
	}
	.ai-avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: 50%;
		border: 2rpx solid #f0f0f0;
		background: #ffffff;
	}
	.user-avatar-wrap {
		width: 74rpx;
		margin-left: 18rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 56rpx;
	}
	.user-avatar {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background:
			radial-gradient(circle at 50% 33%, #4a4a4a 0 15rpx, transparent 16rpx),
			radial-gradient(circle at 50% 82%, #4a4a4a 0 26rpx, transparent 27rpx),
			#e7e7e7;
	}
	.user-label {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #777777;
	}
	.message-main {
		max-width: 548rpx;
	}
	.speaker-line {
		height: 42rpx;
		display: flex;
		align-items: center;
		gap: 8rpx;
		font-size: 24rpx;
		color: #9b9b9b;
	}
	.speaker-line-user {
		justify-content: flex-end;
	}
	.ai-tag {
		height: 28rpx;
		line-height: 28rpx;
		padding: 0 10rpx;
		border-radius: 999rpx;
		background: #e5e5e5;
		color: #8d8d8d;
		font-size: 20rpx;
		font-weight: 700;
	}
	.bubble {
		box-sizing: border-box;
		box-shadow: 0 12rpx 34rpx rgba(0, 0, 0, 0.08);
	}
	.bubble-ai {
		background: #ffffff;
		border-radius: 20rpx;
		padding: 26rpx 28rpx;
	}
	.bubble-user {
		background: linear-gradient(135deg, #151515 0%, #222222 100%);
		border-radius: 22rpx;
		padding: 22rpx 28rpx;
	}
	.bubble-text {
		font-size: 29rpx;
		line-height: 1.65;
		color: #1d1d1f;
		word-break: break-word;
		white-space: pre-wrap;
	}
	.bubble-user .bubble-text {
		color: #ffffff;
		font-weight: 700;
	}
	.order-action {
		height: 58rpx;
		margin-top: 24rpx;
		border-radius: 999rpx;
		border: 2rpx solid #dedede;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 116rpx;
		font-size: 26rpx;
		font-weight: 700;
		color: #111111;
	}
	.action-arrow {
		font-size: 44rpx;
		line-height: 1;
	}
	.question-panel {
		margin-top: 8rpx;
		background: rgba(255, 255, 255, 0.96);
		border-radius: 24rpx;
		padding: 24rpx 24rpx 26rpx;
		box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.08);
	}
	.question-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}
	.question-title {
		font-size: 30rpx;
		font-weight: 800;
	}
	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 10rpx;
		font-size: 24rpx;
		color: #7a7a7a;
	}
	.refresh-icon {
		font-size: 28rpx;
		color: #909090;
	}
	.question-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18rpx;
	}
	.question-card {
		height: 72rpx;
		border-radius: 18rpx;
		border: 2rpx solid #ededed;
		background: #ffffff;
		display: flex;
		align-items: center;
		padding: 0 18rpx;
		box-sizing: border-box;
	}
	.question-icon {
		width: 36rpx;
		height: 36rpx;
		margin-right: 18rpx;
	}
	.question-label {
		flex: 1;
		min-width: 0;
		font-size: 26rpx;
		font-weight: 700;
		color: #202020;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.question-arrow {
		margin-left: 10rpx;
		font-size: 40rpx;
		color: #111111;
		line-height: 1;
	}
	.composer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(148rpx + env(safe-area-inset-bottom));
		display: flex;
		align-items: center;
		gap: 18rpx;
		padding: 18rpx 28rpx 20rpx;
		background: rgba(255, 255, 255, 0.98);
		border-top: 2rpx solid #eeeeee;
		box-sizing: border-box;
		z-index: 20;
	}
	.composer-input {
		flex: 1;
		height: 82rpx;
		padding: 0 28rpx;
		border-radius: 999rpx;
		border: 2rpx solid #dddddd;
		background: #ffffff;
		font-size: 27rpx;
		color: #111111;
		box-shadow: 0 8rpx 22rpx rgba(0, 0, 0, 0.04) inset;
	}
	.composer-placeholder {
		color: #b7b7b7;
	}
	.send-btn {
		width: 86rpx;
		height: 86rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #222222 0%, #050505 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 16rpx 28rpx rgba(0, 0, 0, 0.18);
	}
	.send-btn-disabled {
		opacity: 0.58;
	}
	.send-icon {
		font-size: 40rpx;
		color: #ffffff;
		transform: rotate(-18deg) translateX(2rpx);
	}
	.mock-tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		height: calc(148rpx + env(safe-area-inset-bottom));
		padding: 16rpx 34rpx env(safe-area-inset-bottom);
		background: rgba(255, 255, 255, 0.99);
		border-top: 2rpx solid #eeeeee;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		box-sizing: border-box;
		z-index: 19;
	}
	.mock-tabbar-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font-size: 22rpx;
		font-weight: 500;
		color: #333333;
	}
	.tabbar-icon {
		width: 46rpx;
		height: 46rpx;
		margin-bottom: 10rpx;
		opacity: 0.55;
	}
</style>
