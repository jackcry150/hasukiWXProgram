<template>
	<view class="create-order">
        <scroll-view class="order-scroll" scroll-y :show-scrollbar="false">
		<!-- 地址提示 -->
		<view class="address-notice">
			<view class="address-info">
				<view class="address-data" v-if="address">
					<view class="address-top" @click="selectAddress">
						<view class="address-top-l">
							<image class="address-icon-img" src="/static/image/location.png" mode="widthFix"></image>
							<text class="address-top-l-t">收货地址</text>
						</view>
						<view class="address-top-r">
							<text class="address-top-r-t">换一个</text>
							<text class="right-arrow"></text>
						</view>
					</view>
					<view class="address-de">
						<view class="address-header">
							<text class="contact-name">{{ address.name }}</text>
							<text class="contact-phone">{{ address.phone }}</text>
						</view>
						<view class="address-detail">{{ address.province }} {{ address.city }} {{ address.area }} {{ address.detail }}</view>
					</view>
				</view>
				<view class="address-no" @click="selectAddress" v-else>
					<text class="address-icon">
						<image class="address-icon-img" src="/static/image/location.png" mode="widthFix"></image>
					</text>
					<text class="address-no-text">添加收货地址</text>
				</view>
			</view>
		</view>

		<!-- 商品信息 -->
		<view class="product-section">
			<view class="section-title">商品信息</view>
			<view class="product-item" v-for="(item, index) in product" :key="index">
				<view class="item-image-l">
					<image class="item-image" :src="item.image" mode="aspectFill" />
				</view>
				<view class="item-info">
					<view class="item-title">
						<text class="type-tag presale" v-if="item.type == 2">预售</text>
						<text class="type-tag instock" v-else-if="item.type == 1">现货</text>
						{{ item.title }} {{ item.subtitle }}
					</view>
					<view v-if="item.version" class="item-tag">颜色：{{ item.version }}</view>
					<view class="item-price-quantity">
						<view class="item-price">¥{{ item.price }}</view>
						<view class="quantity-control">
							<view class="quantity-text">×{{ item.quantity }}</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="product-other">
			<!-- 预售定金信息 -->
			<view class="other-item" v-if="hasPresale && totalDepositAmount > 0">
				<view class="method-item">
					<text class="method-label">定金</text>
					<view class="method-value">
						<text class="deposit-amount">¥{{ totalDepositAmount.toFixed(2) }}</text>
						<text class="deposit-tip">（预售商品需先支付定金）</text>
					</view>
				</view>
			</view>
			<view class="other-item" v-if="hasPresale && totalBalanceAmount > 0">
				<view class="method-item">
					<text class="method-label">尾款</text>
					<view class="method-value">
						<text class="balance-amount">¥{{ totalBalanceAmount.toFixed(2) }}</text>
					</view>
				</view>
			</view>

			<view class="other-item" v-for="(item, index) in presaleBalanceItems" :key="'balance-' + index">
				<view class="method-item sku-balance-item">
					<text class="method-label">{{ item.title }}{{ item.version ? ' / ' + item.version : '' }}</text>
					<view class="method-value">
						<text class="balance-amount">尾款 ¥{{ item.balanceAmount }}</text>
						<text class="balance-tip" v-if="item.balanceTip">（{{ item.balanceTip }}）</text>
					</view>
				</view>
			</view>

			<view class="other-item">
				<view class="method-item">
					<text class="method-label">运费</text>
					<view class="method-value">
						<text class="shipping-fee-text">{{ shippingFeeText }}</text>
						<button v-if="shippingQuoteError" size="mini" @click="refreshShippingQuote">重试</button>
					</view>
				</view>
				<view class="shipping-template-info" v-if="shippingQuote && shippingQuote.notice">
					<view class="template-item">
						<view class="template-detail">
							<text class="template-fee">{{ shippingQuote.notice }}</text>
						</view>
					</view>
				</view>
			</view>
			<view class="other-item snail-shells-item">
				<view class="method-item">
					<view class="method-label-wrap">
						<text class="method-label">积分抵扣</text>
						<text class="method-tip">10积分=¥1，最多抵扣20%</text>
					</view>
					<text class="auto-discount-tag" v-if="canUseSnailShells">自动抵扣</text>
				</view>
				<view class="snail-shells-detail" v-if="canUseSnailShells">
					<text>可用 {{ availableSnailShells }} 积分</text>
					<text>本单自动使用 {{ snailShellsToUse }} 积分，抵扣¥{{ snailShellsDiscountAmount }}</text>
				</view>
				<view class="snail-shells-detail disabled" v-else>
					<text>{{ hasPresale ? '预售订单暂不支持积分抵扣' : '暂无可用积分' }}</text>
				</view>
			</view>
			<!-- 支付方式 -->
			<view class="other-item">
				<view class="method-item">
					<text class="method-label">支付方式</text>
					<view class="method-value">
						<text class="method-text">微信支付</text>
						<text class="right-arrow"></text>
					</view>
				</view>
			</view>

			<!-- 备注 -->
			<view class="other-item">
				<view class="method-item">
					<text class="method-label">备注</text>
					<view class="method-value">
						<input id="uni-input-type-text" class="uni-input" v-model="remarks" placeholder="选填，可与客服联系确认" type="text" />
					</view>
				</view>
			</view>
		</view>

            <view class="order-scroll-end"></view>
        </scroll-view>

		<!-- 底部提交栏 -->
		<view class="bottom-bar">
			<view class="total-info">
				<text class="total-text" v-if="!shippingQuote">运费：{{ shippingFeeText }}</text>
				<text class="total-text" v-else-if="hasPresale && totalDepositAmount > 0">
					需支付定金：<text class="total-text-val">¥{{ totalPrice }}</text>
					<text class="presale-note">（尾款¥{{ totalBalanceAmount.toFixed(2) }}）</text>
				</text>
				<text class="total-text" v-else>
					合计：<text class="total-text-val">¥{{ payablePrice }}</text>
					<text class="discount-note" v-if="snailShellsToUse > 0">已抵扣¥{{ snailShellsDiscountAmount }}</text>
				</text>
			</view>
			<button class="submit-btn" :disabled="shippingQuoteLoading" @click="submitOrder">{{ shippingQuoteLoading ? '运费计算中' : '提交订单' }}</button>
		</view>
	</view>
</template>

<script>
	import { api } from '@/utils/request.js'
	const SNAIL_SHELL_RATE = 10
	const SNAIL_SHELL_MAX_PERCENT = 20

	export default {
		name: 'CreateOrder',
		data() {
			return {
				product: [],
				address: null,
				remarks: '',
				shippingFee: 0,
				shippingQuote: null,
				shippingQuoteLoading: false,
				shippingQuoteError: '',
				shippingQuoteRequestId: 0,
				userInfo: {},
			}
		},
		onLoad(options) {
			this.loadUserProfile()
			if (options.cartIds) {
				// 来自购物车：传购物车ID和商品ID，通过接口获取商品详情
				const cartIds = decodeURIComponent(options.cartIds || '').split(',').filter(Boolean)
				const productIds = (options.productIds ? decodeURIComponent(options.productIds || '') : '').split(',').filter(Boolean)
				this.loadFromCart(cartIds, productIds)
			} else if (options.productId) {
				// 来自立即购买：仅传产品ID，通过接口获取商品详情
				this.loadBuyNow(options.productId, decodeURIComponent(options.version || ''), parseInt(options.quantity || 1))
			}
		},
		onShow() {
			const selectedAddress = uni.getStorageSync('selectedAddress')
			if (selectedAddress) {
				this.address = selectedAddress
				this.refreshShippingQuote()
			} else if (this.address && this.address.id) {
				this.refreshShippingQuote()
			} else {
				this.getAddressdeDault()
			}
		},
		computed: {
			presaleBalanceItems() {
				return this.product.filter(item => item.type == 2 && Number(item.price) > Number(item.deposit || 0))
					.map(item => ({
						...item,
						balanceAmount: ((Number(item.price) - Number(item.deposit || 0)) * (item.quantity || 1)).toFixed(2),
						balanceTip: typeof item.presaleBalanceTip === 'string' ? item.presaleBalanceTip.trim() : '预售结束后支付'
					}))
			},
			hasPresale() {
				return this.product.some(item => item.type == 2)
			},
			totalDepositAmount() {
				let total = 0
				this.product.forEach(item => {
					if (item.type == 2 && item.deposit != null) {
						total += parseFloat(item.deposit) * (item.quantity || 1)
					}
				})
				return total
			},
			totalBalanceAmount() {
				let total = 0
				this.product.forEach(item => {
					if (item.type == 2 && item.price != null && item.deposit != null) {
						const balance = Math.max(parseFloat(item.price) - parseFloat(item.deposit), 0)
						total += balance * (item.quantity || 1)
					}
				})
				return total
			},
			totalPrice() {
				// 如果是预售订单，显示定金+运费，否则显示总价+运费
				if (this.hasPresale && this.totalDepositAmount > 0) {
					return (parseFloat(this.totalDepositAmount) + parseFloat(this.shippingFee)).toFixed(2)
				}
				const productTotal = this.product
					.reduce((total, item) => total + (item.price * item.quantity), 0)
				return (parseFloat(productTotal) + parseFloat(this.shippingFee)).toFixed(2)
			},
			shippingFeeText() {
				if (this.shippingQuoteLoading) {
					return '计算中...'
				}
				if (this.shippingQuoteError) {
					return '计算失败'
				}
				if (!this.shippingQuote) {
					return this.address && this.address.id ? '待计算' : '请选择地址'
				}
				if (this.shippingQuote.mode === 'collect') {
					return this.shippingQuote.label || '顺丰到付'
				}
				if (this.shippingQuote.isFreeShipping) {
					return this.shippingQuote.label || '包邮'
				}
				return this.shippingQuote.label || ('¥' + parseFloat(this.shippingFee).toFixed(2))
			},
			availableSnailShells() {
				return Math.max(parseInt(this.userInfo.snailShells || 0), 0)
			},
			maxSnailShells() {
				if (this.hasPresale) return 0
				const orderAmount = parseFloat(this.totalPrice) || 0
				const maxDiscount = Math.floor(orderAmount * SNAIL_SHELL_MAX_PERCENT) / 100
				const shellsByLimit = Math.floor(maxDiscount * SNAIL_SHELL_RATE)
				const shellsByAmount = Math.floor(orderAmount * SNAIL_SHELL_RATE)
				return Math.max(Math.min(this.availableSnailShells, shellsByLimit, shellsByAmount), 0)
			},
			canUseSnailShells() {
				return !this.hasPresale && this.availableSnailShells > 0 && this.maxSnailShells > 0
			},
			snailShellsToUse() {
				return this.canUseSnailShells ? this.maxSnailShells : 0
			},
			snailShellsDiscountAmount() {
				return (this.snailShellsToUse / SNAIL_SHELL_RATE).toFixed(2)
			},
			payablePrice() {
				const amount = (parseFloat(this.totalPrice) || 0) - (parseFloat(this.snailShellsDiscountAmount) || 0)
				return Math.max(amount, 0).toFixed(2)
			}
		},
		methods: {
			async loadUserProfile() {
				const token = uni.getStorageSync('token')
				if (!token) return
				try {
					const res = await api.user.profile()
					if (res.code === 200 && res.data) {
						this.userInfo = res.data.userInfo || res.data || {}
					}
				} catch (e) {}
			},
			goLogin() {
				uni.showModal({
					content: '使用当前功能需要您进行登录，是否去登录?',
					success: function(res) {
						if (res.confirm) {
							uni.navigateTo({
								url: '/pages/login/login'
							})
							return
						} else if (res.cancel) {
							uni.navigateBack()
							return
						}
					}
				})
			},

			loadCartItems(items) {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.goLogin()
				} else {
					this.product = items
					this.refreshShippingQuote()
				}
			},
			async loadFromCart(cartIds, productIds) {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.goLogin()
					return
				}
				if (!cartIds || cartIds.length === 0) {
					uni.showToast({ title: '请选择商品', icon: 'none' })
					setTimeout(() => uni.navigateBack(), 1500)
					return
				}
				uni.showLoading({ title: '加载中...' })
				try {
					const res = await api.cart.list()
					uni.hideLoading()
					if (res.code !== 200 || !res.data) {
						uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
						setTimeout(() => uni.navigateBack(), 1500)
						return
					}
					const ids = cartIds.map(id => parseInt(id)).filter(n => n > 0)
					const items = (res.data || []).filter(item => ids.includes(parseInt(item.id)))
					if (items.length === 0) {
						uni.showToast({ title: '购物车商品已失效，请重新选择', icon: 'none' })
						setTimeout(() => uni.navigateBack(), 1500)
						return
					}
					this.product = items
					this.refreshShippingQuote()
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: '加载失败', icon: 'none' })
					setTimeout(() => uni.navigateBack(), 1500)
				}
			},
			async loadBuyNow(productId, version, quantity) {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.goLogin()
					return
				}
				uni.showLoading({ title: '加载中...' })
				try {
					const res = await api.product.detail({ id: productId })
					uni.hideLoading()
					if (res.code !== 200 || !res.data) {
						uni.showToast({ title: res.msg || '商品不存在', icon: 'none' })
						setTimeout(() => uni.navigateBack(), 1500)
						return
					}
					const p = res.data
					const versionStr = version || (p.version && p.version[0]) || ''
					const colorImage = p.variantImages && versionStr ? p.variantImages[versionStr] : ''
					const variantPrice = p.variantPrices && versionStr ? Number(p.variantPrices[versionStr]) : Number.NaN
					const selectedPrice = Number.isFinite(variantPrice) ? variantPrice : Number(p.price || 0)
					const item = {
						id: '',
						productId: p.id,
						productCode: p.productId || '',
						title: p.title,
						subtitle: p.subtitle || '',
						image: colorImage || (Array.isArray(p.image) ? p.image[0] : p.image),
						price: selectedPrice,
						version: versionStr,
						presaleBalanceTip: p.variantBalanceTips && typeof p.variantBalanceTips[versionStr] === 'string'
							? p.variantBalanceTips[versionStr] : '预售结束后支付',
						quantity: quantity,
						selected: true,
						type: p.type,
						stock: p.stock,
						limitStock: p.limitStock || 0,
						deposit: Number(p.variantDeposits && Object.prototype.hasOwnProperty.call(p.variantDeposits, versionStr) ? p.variantDeposits[versionStr] : (p.deposit || 0))
					}
					this.product = [item]
					this.refreshShippingQuote()
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: '加载失败', icon: 'none' })
					setTimeout(() => uni.navigateBack(), 1500)
				}
			},

			// 运费必须以服务端按地址计算的报价为准
			async refreshShippingQuote() {
				// 每次地址/商品变化都使旧报价失效，包括清空地址的情况。
				const requestId = ++this.shippingQuoteRequestId
				this.shippingQuote = null
				this.shippingFee = 0
				this.shippingQuoteError = ''
				this.shippingQuoteLoading = false
				if (!this.address || !this.address.id || !this.product.length) {
					return false
				}

				this.shippingQuoteLoading = true
				this.shippingQuoteError = ''
				try {
					const product = this.product.map(item => ({
						productId: item.productId,
						version: item.version || '',
						quantity: item.quantity || 1
					}))
					const response = await api.order.shippingQuote({
						addressId: this.address.id,
						product
					})
					if (requestId !== this.shippingQuoteRequestId) return false
					if (response.code !== 200 || !response.data) {
						throw new Error(response.msg || '运费计算失败')
					}
					const quote = response.data
					const fee = Number(quote.fee)
					if (!['number', 'string'].includes(typeof quote.fee) || String(quote.fee).trim() === '' || !Number.isFinite(fee) || fee < 0 || !['fixed', 'collect'].includes(quote.mode)) {
						throw new Error('运费报价无效，请重新计算')
					}
					this.shippingQuote = quote
					this.shippingFee = fee
					return true
				} catch (error) {
					if (requestId !== this.shippingQuoteRequestId) return false
					this.shippingQuote = null
					this.shippingFee = 0
					this.shippingQuoteError = error && error.message ? error.message : '运费计算失败'
					return false
				} finally {
					if (requestId === this.shippingQuoteRequestId) {
						this.shippingQuoteLoading = false
					}
				}
			},

			async getAddressdeDault() {
				if (!this.address || !this.address.id) {
					try {
						const response = await api.address.default()
						if (response.code === 200 && response.data && (!this.address || !this.address.id)) {
							this.address = response.data
							this.refreshShippingQuote()
						}
					} catch (error) {
						// 静默失败，用户可以选择地址
					}
				}
			},

			selectAddress() {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.goLogin()
				} else {
					uni.navigateTo({
						url: '/pages/address/list?t=1'
					})
				}
			},

			async submitOrder() {
				if (!this.address || !this.address.id) {
					uni.showToast({
						title: '请选择收货地址',
						icon: 'none'
					})
					return
				}
				const quoteReady = await this.refreshShippingQuote()
				if (!quoteReady) {
					uni.showToast({
						title: this.shippingQuoteError || '运费计算失败，请稍后重试',
						icon: 'none'
					})
					return
				}
				uni.showLoading({
					title: '提交中...'
				})

				try {
					// 只提交地址ID和产品ID（含版本、数量），后端支付成功后再存产品详情
					const productMinimal = this.product.map(p => ({
						productId: p.productId,
						version: p.version || '',
						quantity: p.quantity || 1,
						id: p.id
					}))
					const params = {
						product: productMinimal,
						address: { id: this.address.id },
						remarks: this.remarks,
						snailShells: this.snailShellsToUse,
					}
					const response = await api.order.create(params)
					uni.hideLoading()

					if (response.code === 200 && response.data) {
						const orderId = response.data.orderId
						const orderNo = response.data.orderNo
						if (!orderId || !orderNo) {
							uni.showToast({ title: '订单创建成功', icon: 'success' })
							setTimeout(() => uni.redirectTo({ url: '/pages/order/list' }), 1500)
							return
						}
						// 预售订单先支付定金，普通订单支付全款
						const payType = this.hasPresale ? 'deposit' : 'full'
						// 创建成功后请求支付 API，获取 payinfo 再调起支付
						uni.showLoading({ title: '获取支付参数...' })
						const payRes = await api.order.pay({ id: orderId, payType })
						uni.hideLoading()
						if (payRes.code === 200 && payRes.data && payRes.data.payment) {
							const payment = { ...payRes.data.payment, orderId: payRes.data.orderId || orderId }
							this.requestPayment(payment, orderNo, payType)
						} else {
							uni.showToast({ title: payRes.msg || '获取支付参数失败', icon: 'none' })
							setTimeout(() => {
								uni.redirectTo({ url: '/pages/order/detail?id=' + orderId })
							}, 1500)
						}
					} else {
						uni.showToast({ title: response.msg || '提交失败', icon: 'none' })
					}
				} catch (error) {
					uni.hideLoading()
					uni.showToast({ title: '提交失败', icon: 'none' })
				}
			},

			// 调用小程序支付
			requestPayment(paymentData, orderNo, payType = 'full') {
				// #ifdef MP-WEIXIN
				uni.requestPayment({
					provider: 'wxpay',
					timeStamp: paymentData.timeStamp || '',
					nonceStr: paymentData.nonceStr || '',
					package: paymentData.package || '',
					signType: paymentData.signType || 'RSA',
					paySign: paymentData.paySign || '',
						success: (res) => {
							// 支付成功
							uni.showToast({
								title: payType === 'deposit' ? '定金支付成功' : '支付成功',
								icon: 'success'
							})
						setTimeout(() => {
							// 跳转到订单详情页
							uni.redirectTo({
								url: '/pages/order/detail?id=' + (paymentData.orderId || '')
							})
						}, 1500)
					},
					fail: (err) => {
						// 支付失败或取消
						if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
							// 用户取消支付
							uni.showToast({
								title: '支付已取消',
								icon: 'none'
							})
							// 跳转到订单列表，用户可以稍后支付
							setTimeout(() => {
								uni.redirectTo({
									url: '/pages/order/list'
								})
							}, 1500)
						} else {
							// 支付失败
							uni.showToast({
								title: '支付失败，请稍后重试',
								icon: 'none'
							})
							// 跳转到订单列表，用户可以稍后支付
							setTimeout(() => {
								uni.redirectTo({
									url: '/pages/order/list'
								})
							}, 1500)
						}
					}
				})
				// #endif

				// #ifndef MP-WEIXIN
				// 非微信小程序环境，提示跳转到订单列表
				uni.showToast({
					title: '订单创建成功',
					icon: 'success'
				})
				setTimeout(() => {
					uni.redirectTo({
						url: '/pages/order/list'
					})
				}, 1500)
				// #endif
			}
		}
	}
</script>

<style scoped>
	.create-order {
		background-color: #f5f5f5;
		height: 100vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

    .order-scroll {
        flex: 1;
        height: 0;
        min-height: 0;
        width: 100%;
    }

    .order-scroll-end { height: 24rpx; }

	.address-notice {
		padding-top: 10rpx;
		margin: auto;
	}

	.address-info,
	.product-section,
	.product-other {
		background-color: #ffffff;
		padding: 30rpx;
		width: 86%;
		margin: 20rpx auto;
		border-radius: 20rpx;
	}

	.address-no {
		padding: 50rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.address-top {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.address-top-l {
		display: flex;
		align-items: center;
	}

	.address-top-l-t {
		font-size: 26rpx;
		margin-left: 10rpx;
	}

	.address-top-r {
		display: flex;
		align-items: center;
	}

	.address-top-r-t {
		color: #cccccc;
		font-size: 24rpx;
		margin-right: 10rpx;
	}

	.address-de {
		padding: 20rpx 0;
	}

	.address-header {
		display: flex;
		align-items: center;
		padding: 16rpx 0;
	}

	.contact-name {
		font-size: 28rpx;
		color: #000000;
		font-weight: bold;
		margin-right: 20rpx;
	}

	.contact-phone {
		font-size: 26rpx;
		color: #000000;
		font-weight: 800;
	}

	.address-detail {
		font-size: 24rpx;
		color: #545454;
		padding: 10rpx 0 10rpx 0;
	}

	.address-icon {
		width: 30rpx;
		height: 30rpx;
	}

	.address-icon-img {
		width: 30rpx;
		height: 30rpx;
	}

	.address-no-text {
		margin-left: 30rpx;
		font-weight: bold;
		font-size: 28rpx;
	}

	.section-title {
		font-size: 24rpx;
		color: #000000;
		font-weight: bold;
		margin-bottom: 20rpx;
	}

	.product-item {
		display: flex;
		align-items: center;
		padding: 15rpx 0;
	}

	.item-image-l {
		width: 200rpx;
		height: 200rpx;
		margin-right: 20rpx;
	}

	.item-image {
		width: 200rpx;
		height: 200rpx;
		border-radius: 10rpx;
	}

	.item-info {
		flex: 1;
	}

	.item-title {
		font-size: 24rpx;
		color: #000000;
		font-weight: 600;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.type-tag {
		display: inline-block;
		padding: 2rpx 12rpx;
		font-size: 20rpx;
		border-radius: 6rpx;
		margin-right: 8rpx;
		font-weight: bold;
	}

	.type-tag.presale {
		background-color: #111111;
		color: #ffffff;
	}

	.type-tag.instock {
		background-color: #4a4a4a;
		color: #ffffff;
	}

	.item-tag {
		font-size: 18rpx;
		background-color: #f5f5f5;
		padding: 6rpx 20rpx;
		border-radius: 20rpx;
		display: inline-block;
		margin: 10rpx 0;
	}

	.item-price-quantity {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: nowrap;
		flex-direction: row;
	}

	.item-price {
		font-size: 32rpx;
		color: #111111;
		font-weight: bold;
	}

	.quantity-text {
		font-size: 20rpx;
		font-weight: 800;
	}

	.other-item {
		padding: 20rpx 0;
	}

	.method-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.method-label {
		font-size: 28rpx;
		font-weight: bold;
	}

	.method-value {
		display: flex;
		align-items: center;
	}

	.sku-balance-item {
		align-items: flex-start;
		flex-direction: column;
		gap: 12rpx;
	}
	.sku-balance-item .method-value {
		flex-wrap: wrap;
		gap: 8rpx;
		max-width: 100%;
	}
	.sku-balance-item .balance-tip {
		white-space: normal;
		word-break: break-all;
	}

	.method-text {
		font-size: 28rpx;
		margin-right: 16rpx;
		line-height: 100%;
	}

	.method-label-wrap {
		display: flex;
		flex-direction: column;
	}

	.method-tip {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #999999;
		font-weight: normal;
	}


	.auto-discount-tag {
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		background: #f2f2f2;
		color: #111111;
		font-size: 22rpx;
		font-weight: 600;
		white-space: nowrap;
	}
	.snail-shells-item {
		border-top: 1px solid #f0f0f0;
	}

	.snail-shells-detail {
		display: flex;
		flex-direction: column;
		margin-top: 14rpx;
		font-size: 24rpx;
		color: #555555;
		line-height: 1.6;
	}

	.snail-shells-detail.disabled {
		color: #999999;
	}

	.deposit-amount,
	.balance-amount {
		font-size: 30rpx;
		color: #111111;
		font-weight: bold;
		margin-right: 10rpx;
	}

	.deposit-tip,
	.balance-tip {
		font-size: 24rpx;
		color: #999999;
	}

	.presale-note {
		display: block;
		font-size: 22rpx;
		color: #999999;
		font-weight: normal;
		margin-top: 5rpx;
	}

	.discount-note {
		display: block;
		margin-top: 4rpx;
		font-size: 22rpx;
		color: #666666;
		font-weight: normal;
	}

	.shipping-template-info {
		margin-top: 15rpx;
		padding-top: 15rpx;
		border-top: 1px solid #f0f0f0;
	}

	.template-item {
		margin-bottom: 15rpx;
	}

	.template-item:last-child {
		margin-bottom: 0;
	}

	.template-name {
		font-size: 26rpx;
		color: #333333;
		font-weight: 500;
		margin-bottom: 8rpx;
	}

	.template-detail {
		display: flex;
		flex-direction: column;
		gap: 5rpx;
	}

	.template-type {
		font-size: 24rpx;
		color: #666666;
	}

	.template-fee {
		font-size: 24rpx;
		color: #999999;
		line-height: 1.5;
	}

	.right-arrow {
		display: inline-block;
		width: 30rpx;
		height: 30rpx;
		background-image: url('/static/image/right-arrow.png');
		background-size: 100%;
		background-position: center;
		margin-top: 4rpx;
	}

	.bottom-bar {
		position: relative;
		flex-shrink: 0;
		width: 100%;
		background-color: #ffffff;
		min-height: 140rpx;
		box-sizing: border-box;
		padding: 20rpx 30rpx;
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		z-index: 10;
		gap: 20rpx;
		display: flex;
		align-items: center;
	}

	.total-info {
		flex: 1;
		min-width: 0;
	}

	.total-text {
		font-size: 24rpx;
		font-weight: 800;
	}

	.total-text-val {
		font-size: 40rpx;
		color: #111111;
		font-weight: bold;
	}

	.submit-btn {
		background-color: #111111;
		color: #ffffff;
		border: none;
		border-radius: 50rpx;
		flex: 0 0 240rpx;
		width: 240rpx;
		margin: 0;
		padding: 0 20rpx;
		line-height: 80rpx;
		white-space: nowrap;
		font-size: 28rpx;
		font-weight: bold;
	}
</style>
