<template>
  <svg></svg>
</template>

<script>
import * as d3 from "d3";
//const d3 = require('d3');
import store from "../store.js";

export default {
  name: "Visualization",
  data() {
    return {
      _data: null,
      graph: null,
      simulation: null,
      //color: d3.scaleOrdinal(d3.schemeCategory20),
      settings: {
        strokeColor: "#29B5FF",
        width: 100,
        svgWigth: 960,
        svgHeight: 600
      }
    };
  },
  store,
  mounted() {
    this.loadData();
    this.init();
  },
  methods: {
    async loadData() {
      const data = await d3.csv("./data/Nehody2018.csv");
      this._data = data;
    },
    init() {
      this.render();
    },
    render() {
      //let theMap = this.$store.state.map;
      console.log(this.$store.state);
      let map = this.$store.state.map;
      let container = map.getCanvasContainer(); //this.$store.state.container;
      //let container = theMap.
      //console.log("zulul");
      //console.log(theMap);
      //console.log(theMap);
      //console.log(theMap.getCanvasContainer());
      //let container = theMap.getCanvasContainer();
      //let container = d3.select("#map");
      //d3.select(this.$el)
      let svg = d3
        .select(this.$el)
        .attr("id", "test_svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);

      let g = svg
        .append("g")
        .append("circle")
        .attr("class", "nodes")
        .attr("cx", "250")
        .attr("cy", "150")
        .attr("r", "100");

      console.log("yaaay");
      //console.log(container);
      //console.log(this.$el);
    }
    /*listener () {
            this.$parent.$on('map-move', () => {
                this.render();
                console.log("map-move");
            });
            this.$parent.$on('map-zoom', () => {
                this.render();
                console.log("map-zoom");
            });
        }*/
  }
};

/*
        <svg id="svg" pointer-events="all" preserveAspectRatio="xMinYMin meet">
            <g :id="nodes"></g>
        </svg>
*/
</script>

<style scoped>
.nodes {
  fill: rgb(177, 0, 0);
  stroke: #fff;
  stroke-width: 2px;
}

#test_svg {
  position: absolute;
}
</style>
