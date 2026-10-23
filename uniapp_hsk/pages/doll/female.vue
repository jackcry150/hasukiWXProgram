<template><view class="redirect-page">正在打开服装包…</view></template>
<script>
export default { onLoad() { uni.redirectTo({ url: '/pages/product/list?category_code=clothing_pack' }) } }
</script>
<style scoped>.redirect-page { padding:48rpx; color:#666; }</style>
