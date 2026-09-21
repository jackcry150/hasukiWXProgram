<template>
	<view class="profile-page">
		<view class="profile-page__glow profile-page__glow--left"></view>
		<view class="profile-page__glow profile-page__glow--right"></view>

		<view class="profile-shell" :style="{ paddingTop: `${statusBarHeight + 18}px` }">
			<view class="profile-avatar-section">
				<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
					<image
						:src="(userInfo && userInfo.avatar) ? userInfo.avatar : '/static/image/default_avatar.jpg'"
						class="avatar-image"
						mode="aspectFill"
					></image>
					<view class="avatar-camera">
						<image class="avatar-camera-icon" src="/static/image/icon_camera.png" mode="aspectFit"></image>
					</view>
				</button>
				<view class="avatar-tip">
					<text class="avatar-tip-icon">✦</text>
					<text>点击头像更换</text>
				</view>
			</view>

			<view class="profile-card">
				<view class="profile-item" @click="focusNickname">
					<view class="profile-item__main">
						<view class="profile-item__iconbox">
							<image class="profile-item__icon" src="/static/image/icon_brand.png" mode="aspectFit"></image>
						</view>
						<text class="profile-item__label">昵称</text>
					</view>
					<view class="profile-item__side">
						<input
							id="profile-nickname-input"
							class="profile-item__input"
							@blur="handleBlur"
							type="nickname"
							:value="(userInfo && userInfo.nickName) ? userInfo.nickName : ''"
							placeholder="请输入昵称"
							placeholder-class="profile-item__placeholder"
						/>
						<text class="profile-item__arrow">›</text>
					</view>
				</view>

				<view class="profile-item" @click="goToAddress">
					<view class="profile-item__main">
						<view class="profile-item__iconbox">
							<image class="profile-item__icon" src="/static/image/icon_address.png" mode="aspectFit"></image>
						</view>
						<text class="profile-item__label">收货地址</text>
					</view>
					<view class="profile-item__side">
						<text class="profile-item__value profile-item__value--address">{{ addressText }}</text>
						<text class="profile-item__arrow">›</text>
					</view>
				</view>

			</view>
		</view>
	</view>
</template>

<script>
	import { api } from '@/utils/request.js'

	export default {
		data() {
			return {
				statusBarHeight: 44,
				userInfo: {
					nickName: '',
					id: '',
					avatar: '/static/image/default_avatar.jpg',
					gender: '',
					birthday: '',
					province: '',
					city: '',
					district: '',
				},
				defaultAddress: null,
				uploadResult: false,
			}
		},
		computed: {
			addressText() {
				const addressParts = [
					this.defaultAddress && this.defaultAddress.province,
					this.defaultAddress && this.defaultAddress.city,
					this.defaultAddress && (this.defaultAddress.region || this.defaultAddress.district),
				].filter(Boolean)
				return addressParts.length ? addressParts.join(' ') : '未设置'
			},
		},
		onLoad() {
			const systemInfo = uni.getWindowInfo ? uni.getWindowInfo() : {}
			this.statusBarHeight = systemInfo.statusBarHeight || 22
			this.getProfileInfo()
		},
		onShow() {
			this.getDefaultAddress()
		},
		methods: {
			resolveDefaultAddress(addressList = []) {
				if (!Array.isArray(addressList) || !addressList.length) {
					return null
				}
				const defaultAddress = addressList.find(item => Number(item && item.isDefault) === 1 || item && item.isDefault === true)
				return defaultAddress || addressList[0] || null
			},

			async getProfileInfo() {
				const token = uni.getStorageSync('token')
				if (token) {
					try {
						const response = await api.user.profile()
						const profile = response && response.data ? response.data : null
						if (!profile || !profile.id) {
							throw new Error('invalid profile')
						}
						this.userInfo = {
							nickName: profile.nickName || '',
							id: profile.id || '',
							avatar: profile.avatar || '/static/image/default_avatar.jpg',
							gender: profile.gender || '',
							birthday: profile.birthday || '',
							province: profile.province || '',
							city: profile.city || '',
							district: profile.district || '',
							...profile
						}
					} catch (error) {
						uni.removeStorageSync('token')
						uni.showToast({
							title: '登录已失效',
							icon: 'none'
						})
						setTimeout(() => {
							uni.reLaunch({
								url: '/pages/login/login'
							})
						}, 500)
					}
				} else {
					uni.reLaunch({
						url: '/pages/login/login'
					})
				}
			},

			async getDefaultAddress() {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.defaultAddress = null
					return
				}
				try {
					const response = await api.address.default()
					if (response && response.data && response.data.id) {
						this.defaultAddress = response.data
						return
					}

					const listResponse = await api.address.list()
					this.defaultAddress = this.resolveDefaultAddress(listResponse && listResponse.data)
				} catch (error) {
					try {
						const listResponse = await api.address.list()
						this.defaultAddress = this.resolveDefaultAddress(listResponse && listResponse.data)
					} catch (fallbackError) {
						this.defaultAddress = null
					}
				}
			},

			focusNickname() {
				const query = uni.createSelectorQuery().in(this)
				query.select('#profile-nickname-input').fields({ node: true }, (res) => {
					res?.node?.focus?.()
				}).exec()
			},

			async onChooseAvatar(event) {
				uni.showLoading({
					title: '上传中...'
				})
				let that = this
				const tmpFilePath = event.detail.avatarUrl
				try {
					const fileManager = wx.getFileSystemManager()
					const base64Data = fileManager.readFileSync(tmpFilePath, 'base64')
					that.avatar = 'data:image/jpeg;base64,' + base64Data
					this.uploadResult = true
				} catch (error) {
					uni.hideLoading()
					uni.showToast({
						title: '头像处理失败',
						icon: 'none'
					})
				}

				if (this.userInfo.avatar !== that.avatar && this.uploadResult) {
					try {
						const params = {
							avatar: that.avatar,
						}
						const response = await api.user.avatar(params)
						uni.hideLoading()
						uni.showToast({
							title: response.msg,
							icon: 'success'
						})
						this.userInfo.avatar = that.avatar
					} catch (error) {
						uni.hideLoading()
						uni.showToast({
							title: '头像更新失败',
							icon: 'none'
						})
					}
				}
			},

			async handleBlur(event) {
				const nickName = String(event.detail.value || '').trim()
				if (nickName === this.userInfo.nickName) {
					return
				}
				try {
					const params = {
						nickName,
					}
					const response = await api.user.nickName(params)
					this.userInfo.nickName = nickName
					uni.showToast({
						title: response.msg,
						icon: 'success'
					})
				} catch (error) {
					uni.showToast({
						title: '昵称更新失败',
						icon: 'none'
					})
				}
			},

			goToAddress() {
				uni.navigateTo({
					url: '/pages/address/list'
				})
			},
		}
	}
</script>

<style scoped>
	.profile-page {
		position: relative;
		min-height: 100vh;
		background:
			radial-gradient(circle at 8% 10%, rgba(255, 255, 255, 0.28), transparent 24%),
			radial-gradient(circle at 92% 14%, rgba(220, 220, 220, 0.3), transparent 24%),
			linear-gradient(180deg, #efefef 0%, #f7f7f7 56%, #fbfbfb 100%);
		overflow: hidden;
	}

	.profile-page__glow {
		position: absolute;
		border-radius: 999rpx;
		pointer-events: none;
		filter: blur(20rpx);
		opacity: 0.6;
	}

	.profile-page__glow--left {
		left: -120rpx;
		top: 220rpx;
		width: 260rpx;
		height: 260rpx;
		background: rgba(255, 255, 255, 0.3);
	}

	.profile-page__glow--right {
		right: -120rpx;
		top: 720rpx;
		width: 280rpx;
		height: 280rpx;
		background: rgba(210, 210, 210, 0.32);
	}

	.profile-shell {
		position: relative;
		z-index: 1;
		padding: 0 28rpx 120rpx;
	}

	.profile-avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 18rpx 0 34rpx;
	}

	.avatar-btn {
		position: relative;
		width: 240rpx;
		height: 240rpx;
		padding: 0;
		border-radius: 50%;
		background: transparent;
		border: none;
	}

	.avatar-btn::after {
		display: none;
	}

	.avatar-image {
		width: 240rpx;
		height: 240rpx;
		border-radius: 50%;
		border: 8rpx solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 24rpx 52rpx rgba(0, 0, 0, 0.12);
	}

	.avatar-camera {
		position: absolute;
		right: 2rpx;
		bottom: 6rpx;
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		background: #ffffff;
		box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-camera-icon {
		width: 36rpx;
		height: 36rpx;
	}

	.avatar-tip {
		margin-top: 28rpx;
		display: inline-flex;
		align-items: center;
		gap: 10rpx;
		font-size: 24rpx;
		color: #b3a395;
	}

	.avatar-tip-icon {
		font-size: 20rpx;
		color: #7a7a7a;
	}

	.profile-card {
		padding: 12rpx 28rpx;
		border-radius: 36rpx;
		background: rgba(255, 255, 255, 0.84);
		box-shadow: 0 28rpx 68rpx rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(8rpx);
	}

	.profile-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 126rpx;
		border-bottom: 2rpx solid rgba(240, 232, 222, 0.92);
	}

	.profile-item--last {
		border-bottom: none;
	}

	.profile-item__main {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.profile-item__iconbox {
		width: 72rpx;
		height: 72rpx;
		border-radius: 22rpx;
		background: linear-gradient(180deg, #f5f5f5 0%, #ebebeb 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 22rpx;
	}

	.profile-item__icon {
		width: 38rpx;
		height: 38rpx;
	}

	.profile-item__label {
		font-size: 28rpx;
		line-height: 1.2;
		font-weight: 700;
		color: #1d1814;
	}

	.profile-item__side {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		min-width: 0;
	}

	.profile-item__input,
	.profile-item__value {
		text-align: right;
		font-size: 24rpx;
		line-height: 1.4;
		color: #8d8379;
	}

	.profile-item__input {
		flex: 1;
		min-width: 0;
	}

	.profile-item__placeholder {
		color: #b7afa7;
	}

	.profile-item__value {
		max-width: 360rpx;
	}

	.profile-item__value--address {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.profile-item__arrow {
		margin-left: 18rpx;
		font-size: 40rpx;
		line-height: 1;
		color: #111111;
	}
</style>
