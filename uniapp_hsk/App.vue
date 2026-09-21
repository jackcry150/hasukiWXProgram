<script>
import analytics from './utils/analytics.js'
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function(options) {
            analytics.show(options)
			console.log('App Show')
		},
		onHide: function() {
            analytics.hide()
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */

</style>