import Vue from 'vue'
import App from './App.vue'
import store from './store'
import Buefy from 'buefy'
// import 'buefy/dist/buefy.css'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(Buefy)

Vue.config.productionTip = false

new Vue({
  // el: '#app',
  store,
  components: {},
  methods: {},
  render: h => h(App)
}).$mount('#app')
