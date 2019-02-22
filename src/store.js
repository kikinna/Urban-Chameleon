import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    map: {},
    container: {}
  },
  mutations: {
    loadMap (state, map) {
      //console.log("nonmutation", container);
      state.map = map;
      state.container = map.getCanvasContainer();
      console.log("mutation canvas", state.container);
      //state.mapLoaded = true
    }
  },
  actions: {
    loadMap (context) {
      context.commit('loadMap', map, container);
    }
  }
})
