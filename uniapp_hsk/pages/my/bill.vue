<template>
	<view class="lottery-page">
		<view class="hero-card">
			<view class="hero-copy">
				<text class="hero-title">积分抽奖</text>
				<text class="hero-subtitle">消耗积分，换一次随机惊喜</text>
			</view>
			<view class="shell-balance">
				<text class="shell-label">当前积分</text>
				<text class="shell-value">{{ userInfo.snailShells || 0 }}</text>
			</view>
		</view>

		<view class="rule-card">
			<view class="section-head">
				<text class="section-title">抽奖规则</text>
				<text class="section-cost">每次消耗 {{ cost }} 积分</text>
			</view>
			<text class="rule-text">{{ ruleText }}</text>
		</view>

		<view class="action-card">
			<button class="draw-btn" :disabled="drawing" @click="startDraw">
				{{ drawButtonText }}
			</button>
			<text class="draw-tip" v-if="(userInfo.snailShells || 0) < cost">当前积分不足，先去完成订单或活动获取积分</text>
		</view>

		<view class="prize-card">
			<view class="section-head">
				<text class="section-title">奖池预览</text>
				<text class="section-meta">{{ prizes.length }} 个奖项</text>
			</view>
			<view class="prize-grid" v-if="prizes.length">
				<view class="prize-item" v-for="item in prizes" :key="item.id">
					<image v-if="item.image" class="prize-image" :src="item.image" mode="aspectFill" />
					<view v-else class="prize-image prize-fallback">{{ item.name.slice(0, 2) }}</view>
					<text class="prize-name">{{ item.name }}</text>
					<text class="prize-type">{{ formatPrizeDesc(item) }}</text>
					<text class="prize-stock">库存：{{ item.stockText }}</text>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text class="empty-text">暂未配置奖品</text>
			</view>
		</view>

		<view class="record-card">
			<view class="section-head">
				<text class="section-title">我的抽奖记录</text>
				<text class="section-meta">{{ records.length }} 条</text>
			</view>
			<view v-if="records.length" class="record-list">
				<view class="record-item" v-for="item in records" :key="item.id">
					<view class="record-main">
						<text class="record-name">{{ item.prizeName }}</text>
						<text class="record-desc">{{ formatPrizeDesc(item) }}</text>
					</view>
					<view class="record-side">
						<text class="record-time">{{ item.createDate }}</text>
					</view>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text class="empty-text">还没有抽奖记录，试试手气吧</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { api } from '@/utils/request.js'

	export default {
		name: 'Bill',
		data() {
			return {
				cost: 10,
				ruleText: '每次抽奖消耗固定数量积分，奖品和概率以后台配置为准。',
				userInfo: {
					snailShells: 0
				},
				prizes: [],
				records: [],
				drawing: false
			}
		},
		computed: {
			drawButtonText() {
				return this.drawing ? '抽奖中...' : `立即抽奖 -${this.cost} 积分`
			}
		},
		onShow() {
			this.getLotteryInfo()
		},
		methods: {
			goLogin() {
				uni.showModal({
					content: '使用当前功能需要先登录，是否去登录？',
					success: function(res) {
						if (res.confirm) {
							uni.navigateTo({
								url: '/pages/login/login'
							})
						} else if (res.cancel) {
							uni.navigateBack()
						}
					}
				})
			},
			formatPrizeDesc(item) {
				if (item.rewardType == 2 && item.rewardValue > 0) {
					return `获得 ${item.rewardValue} 积分`
				}
				if (item.rewardType == 3 && item.rewardValue > 0) {
					return `获得 ${item.rewardValue} 张收藏卡`
				}
				if (item.rewardType == 4) {
					return item.description || '实物奖品'
				}
				return item.description || item.rewardTypeText || '谢谢参与'
			},
			async getLotteryInfo() {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.goLogin()
					return
				}
				try {
					const response = await api.lottery.info()
					if (response.code !== 200) {
						throw new Error(response.msg || '获取抽奖信息失败')
					}
					const data = response.data || {}
					this.cost = data.cost || 10
					this.ruleText = data.rule || this.ruleText
					this.userInfo = data.userInfo || { snailShells: 0 }
					this.prizes = data.prizes || []
					this.records = data.records || []
				} catch (error) {
					uni.showToast({
						title: error.message || '加载失败',
						icon: 'none'
					})
				}
			},
			async startDraw() {
				if (this.drawing) {
					return
				}
				if ((this.userInfo.snailShells || 0) < this.cost) {
					uni.showToast({
						title: '积分不足',
						icon: 'none'
					})
					return
				}
				this.drawing = true
				try {
					const response = await api.lottery.draw()
					if (response.code !== 200) {
						throw new Error(response.msg || '抽奖失败')
					}
					const result = response.data || {}
					const prize = result.prize || {}
					this.userInfo.snailShells = result.snailShells || 0
					uni.showModal({
						title: '抽奖结果',
						content: `${prize.name || '未知奖品'}\n${this.formatPrizeDesc(prize)}`,
						showCancel: false
					})
					this.getLotteryInfo()
				} catch (error) {
					uni.showToast({
						title: error.message || '抽奖失败',
						icon: 'none'
					})
				} finally {
					this.drawing = false
				}
			}
		}
	}
</script>

<style scoped>
	.lottery-page {
		min-height: 100vh;
		padding: 24rpx;
		background:
			radial-gradient(circle at top left, rgba(255, 255, 255, 0.34), transparent 28%),
			linear-gradient(180deg, #efefef 0%, #f7f7f7 100%);
		box-sizing: border-box;
	}

	.hero-card,
	.rule-card,
	.action-card,
	.prize-card,
	.record-card {
		background: rgba(255, 255, 255, 0.9);
		border-radius: 28rpx;
		padding: 28rpx;
		box-shadow: 0 16rpx 36rpx rgba(0, 0, 0, 0.08);
		margin-bottom: 22rpx;
	}

	.hero-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24rpx;
		background: linear-gradient(135deg, #161616 0%, #2a2a2a 100%);
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
	}

	.hero-title {
		font-size: 44rpx;
		font-weight: 900;
		color: #ffffff;
	}

	.hero-subtitle {
		margin-top: 12rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.72);
	}

	.shell-balance {
		min-width: 180rpx;
		padding: 18rpx 20rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.12);
		text-align: right;
	}

	.shell-label,
	.section-meta,
	.section-cost,
	.prize-stock,
	.record-time,
	.draw-tip {
		font-size: 22rpx;
		color: #717171;
	}

	.shell-value {
		display: block;
		margin-top: 8rpx;
		font-size: 44rpx;
		font-weight: 900;
		color: #ffffff;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 18rpx;
		gap: 16rpx;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 800;
		color: #1d1a15;
	}

	.rule-text {
		font-size: 24rpx;
		line-height: 1.7;
		color: #4f4f4f;
	}

	.draw-btn {
		height: 92rpx;
		border: none;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #111111 0%, #2d2d2d 100%);
		color: #fff;
		font-size: 30rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 18rpx 28rpx rgba(0, 0, 0, 0.18);
	}

	.draw-btn[disabled] {
		opacity: 0.65;
	}

	.draw-tip {
		display: block;
		margin-top: 16rpx;
		text-align: center;
	}

	.prize-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18rpx;
	}

	.prize-item {
		background: #f4f4f4;
		border-radius: 22rpx;
		padding: 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		min-height: 260rpx;
	}

	.prize-image,
	.prize-fallback {
		width: 110rpx;
		height: 110rpx;
		border-radius: 24rpx;
	}

	.prize-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #111111 0%, #383838 100%);
		font-size: 30rpx;
		font-weight: 800;
		color: #ffffff;
	}

	.prize-name {
		margin-top: 16rpx;
		font-size: 28rpx;
		font-weight: 800;
		color: #1e1a16;
	}

	.prize-type {
		margin-top: 10rpx;
		font-size: 22rpx;
		color: #5a5a5a;
		line-height: 1.5;
	}

	.record-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.record-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		padding: 18rpx 0;
		border-bottom: 1rpx solid rgba(17, 17, 17, 0.08);
	}

	.record-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.record-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.record-name {
		font-size: 28rpx;
		font-weight: 700;
		color: #1f1a14;
	}

	.record-desc {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #666666;
	}

	.empty-state {
		padding: 30rpx 0 10rpx;
		text-align: center;
	}

	.empty-text {
		font-size: 24rpx;
		color: #7d7d7d;
	}
</style>
