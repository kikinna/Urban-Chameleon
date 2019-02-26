<template>
  <svg></svg>
</template>

<script>
import * as d3 from "d3";
import store from "../store.js";

export default {
  name: "Visualization",
  data() {
    return {
      _data: null,
      graph: null,
      simulation: null,
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
    }
  }
};

</script>

<style>
.nodes {
  fill: rgb(177, 0, 0);
  stroke: #fff;
  stroke-width: 2px;
}

#test_svg {
  position: absolute;
}
</style>
