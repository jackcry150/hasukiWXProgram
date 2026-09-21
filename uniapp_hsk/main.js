import analytics from './utils/analytics.js'
import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
analytics.install(Vue)
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  analytics.install(app)
  return {
    app
  }
}
// #endif