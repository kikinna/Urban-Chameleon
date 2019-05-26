/* eslint-disable no-undef */
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    map: {},
    neighbourhoodImage: null
  },
  mutations: {
    // loads the map into global state
    loadMap (state, map) {
      state.map = map
    },
    storeNeighbourhoodImage (state, imagedata) {
      state.neighbourhoodImage = imagedata
    }
  },
  actions: {
    loadMap (context) {
      context.commit('loadMap', state.map)
    },
    loadData (context, data) {
      context.commit('loadData', data)
    },
    storeNeighbourhoodImage (context, imagedata) {
      context.commit('storeNeighbourhoodImage', imagedata)
    }
  },
  getters: {}
})
