<template>
  <svg></svg>
</template>

<script>
import * as d3 from "d3" //too many things
import { csv } from "d3" 
import store from "../store.js"
import { mapState } from 'vuex'

export default {
  name: "Visualization",
  store,
  mounted() {
    this.loadData();
    console.log(this.$store.state.dataset);
    //console.log(this.$store.state.dataset[""0""]);
    //this.init();
  },
  methods: {
    loadData() {
      csv("./data/Nehody2018.csv").then(data => { //d3.csv
          /* data.forEach(d => {
            stuff.OBJECTID = +d.OBJECTID;
            //d.DruhNehody = +d.DruhNehody;
            stuff["X"] = +d["X"]; 
            //this.$store.dispatch('loadData', d);
            //console.log(d);
          }); */
          //console.log(data);
          this.$store.dispatch('loadData', data);
        }).catch(error => {
        console.error('Could not read the file.')
      });
      //console.log("loaded", this.dataset);
    },
    init() {
      //this.renderCircle();
      this.renderSimulation();
    },
    renderCircle() {
      const svg = d3
        .select(this.$el)
        .attr("id", "test_svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);

      const g = svg
        .append("g")
        .append("circle")
        .attr("class", "nodes")
        .attr("cx", "250")
        .attr("cy", "150")
        .attr("r", "100");
    },
    renderSimulation() {
      const svg = d3
        .select(this.$el)
        .attr("id", "test_svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);

        console.log("why", this.dataset);

      //this.simulation = d3
      //  .forceSimulation(this.dataset);
        //.force("x", d3.forceX())
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
