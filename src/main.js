import Vue from 'vue'
import App from './App.vue'
import store from './store'
//import Mapbox from 'mapbox-gl-vue';

Vue.config.productionTip = false

new Vue({
  el: '#app',
  //store,
  //components: { },
  data:{
    product: "Socks",
  },
  render: h => h(App),
}).$mount('#app')


