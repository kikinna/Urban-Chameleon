import Vue from 'vue'
import App from './App.vue'
import store from './store'
//import Mapbox from 'mapbox-gl-vue';
import * as d3 from "d3";

Vue.config.productionTip = false



new Vue({
  //el: '#app',
  store,
  components: {

  },
  methods: {
    plsWork() {

    }
  },
  
  render: h => h(App),
}).$mount('#app')


