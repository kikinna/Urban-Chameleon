import Vue from 'vue'
import Vuex from 'vuex'
//import * as d3 from 'd3'
//import {csv} from 'd3-request'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    map: {},
    dataset: []
  },
  mutations: {
    loadMap(state, map) {
      state.map = map;
    },
    loadData(state, data) {
      state.dataset.push(data);
    }
  },
  actions: {
    loadMap(context) {
      context.commit('loadMap', map, container);
    },
    loadData(context, data) {
      context.commit('loadData', data);
    }
  },
  getters: {

  }
})
