import Vue from 'vue'
import App from './App.vue'
import store from './store'

Vue.config.productionTip = false
window.Vue = Vue;

import Buefy from 'buefy'
import 'buefy/dist/buefy.css'

Vue.use(Buefy)

new Vue({
  //el: '#app',
  store,
  components: {
  },
  methods: {
  },
  render: h => h(App),
}).$mount('#app')


