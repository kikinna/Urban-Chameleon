<template>
  <svg></svg>
</template>

<script>
//import * as d3 from "d3" //too many things
import { csv, select } from "d3" 
import store from "../store.js"
import { mapState, mapGetters } from 'vuex'
import accidentData from "./data/nehody2018.js";

export default {
  name: "Visualization",
  store,
  data() {
    return {
      _data: null,
      componentDataset: [],
      simulation: null
    }
  },
  mounted() {
    //this.loadData();
    /* console.log("yolo", this.$store.state.datasetObject);
    console.log("yolo", this.$store.state.datasetObject[0]);
    console.log("yolo", this.$store.state.datasetObject["0"]); */
    /* console.log(this.$store.state.dataset);
    console.log("pls", this.$store.state.dataset["0"]);
    console.log("plsNumeroDuo", this.$store.state.datasetNumeroDuo);
    console.log("plsNumeroDuo", this.$store.state.datasetNumeroDuo.get(100)); */
    //this.init();
    //console.log(this.dataset[0]);
    
    this._data = accidentData;
    console.log(this._data);
    console.log(this._data.accidents[33]);

  },
  computed: {
    ...mapState(['dataset']),
    },
  methods: {
    loadData() {
      let count = 0;
      d3.csv("./data/Nehody2018.csv").then(data => { //d3.csv
           /* data.forEach(d => {
            //stuff.OBJECTID = +d.OBJECTID;
            //d.DruhNehody = +d.DruhNehody;
            //stuff["X"] = +d["X"]; 
            //this.$store.dispatch('loadData', d);
            componentDataset[count] = d;
            //console.log(d);
            //Vue.set(this.$store.state.dataset, count++, d);
          });  */
          //console.log(data);
          //console.log(data[0]);
          this.$store.dispatch('loadData', data);
        }).catch(error => {
        console.error('Could not read the file.')
      });
      //console.log("loaded", this.componentDataset);
      //console.log("loaded2", this.componentDataset[0]);
    },
    init() {
      //this.renderCircle();
      this.renderSimulation();
    },
    renderCircle() {
      const svg = d3
        .select(this.$el)
        .attr("id", "viz")
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
      const svg = d3.
        select(this.$el)
        .attr("id", "viz")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);

        console.log("why", this.componentDataset);

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

#viz {
  position: absolute;
}
</style>
 