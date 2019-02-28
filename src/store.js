import Vue from 'vue'
import Vuex from 'vuex'
//import {csv} from 'd3-request'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    map: {},
    dataset: [],
    datasetNumeroDuo: new Map(),
    datasetObject: {}
  },
  mutations: {
    loadMap(state, map) {
      state.map = map;
    },
    loadData(state, data) {
      //state.dataset.push(data);
      let count = 0;
      data.forEach(d => {
        //store.set(state.dataset, count, d);
        state.dataset[count] = d;
        state.datasetObject[count] = d;
        state.datasetNumeroDuo.set(count, d);
        //state.dataset[count] = d;
        //state.dataset.push(d);
        //count = ((parseInt(count, 10) + 1).toString());
        //console.log(count);
        count++;
      });
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
