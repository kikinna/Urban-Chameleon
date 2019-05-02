import Vue from 'vue'
import Vuex from 'vuex'
//import {csv} from 'd3-request'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    map: {},
    datasetObject: {
      dataset: [],
      get getData() {
        return Object.keys(this.dataset)
      }
    },
    neighbourhoodImage: null
  },
  mutations: {
    loadMap(state, map) {
      state.map = map
    },
    loadData(state, data) {
      //state.dataset.push(data);
      // console.log('bef', state.dataset)
      /* Object.defineProperty(state.datasetObject, 'nested', {
        configurable: false
      }) */
      // console.log('af', state.dataset)
      let count = 0 //1?
      data.forEach(d => {
        //store.set(state.dataset, count, d);
        //state.dataset[count] = d
        //state.dataset.push(d);
        Vue.set(state.datasetObject.dataset, count, d)
        count++
      })
      /* state.dataset = data */
      /* Object.freeze(state.datasetObject)
      state.datasetObject.dataset.forEach(o => Object.freeze(o)) */
    },
    storeNeighbourhoodImage(state, imagedata) {
      state.neighbourhoodImage = imagedata
    }
  },
  actions: {
    loadMap(context) {
      context.commit('loadMap', state.map)
    },
    loadData(context, data) {
      context.commit('loadData', data)
    },
    storeNeighbourhoodImage(context, imagedata) {
      context.commit('storeNeighbourhoodImage', imagedata)
    }
  },
  getters: {}
})
