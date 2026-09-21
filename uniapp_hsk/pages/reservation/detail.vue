<template><view></view></template>
<script>
export default {
  onLoad(options) {
    let scene=''; try { scene=decodeURIComponent(options.scene || '') } catch {}
    const id=Number(options.id || (/^p[0-9]+$/.test(scene) ? scene.slice(1) : 0))
    if(id>0) uni.redirectTo({url:'/pages/product/detail?id='+id})
    else uni.showToast({title:'商品码无效',icon:'none'})
  }
}
</script>
