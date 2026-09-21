<template>
	<view class="customer">
		<view data-eventsync="true"
			class="list"
			v-for="(item, index) in customerServiceList"
			:key="index"
			@click="goToCustomer(item)"
		>
			<image data-eventsync="true" class="list-image" :src="item.image" mode="widthFix"></image>
		</view>
	</view>
</template>

<script>
import { openCustomerService } from '@/utils/customer-service.js'

export default {
  data() {
    return {
      customerServiceList: [{ id: 'hasuki', image: '/static/image/icon_service.png' }]
    }
  },
  methods: {
    goToCustomer() {
      openCustomerService()
    }
  }
}
</script>

<style scoped>
.customer {
	min-height: 100vh;
	background: linear-gradient(180deg, #efefef 0%, #f8f8f8 100%);
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	align-items: center;
}

.list {
	width: 86%;
	padding: 40rpx 0;
	filter: grayscale(1);
}

.list-image {
	width: 100%;
	height: auto;
}
</style>
