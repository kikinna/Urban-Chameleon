<template>
  <svg></svg>
</template>

<script>
import * as d3 from "d3";
import store from "../store.js";
import accidentData from "../data/nehody2018.js";

export default {
  name: "Visualization",
  data() {
    return {
      _data: null,
      graph: null,
      simulation: null,
      path: null,
      svg: null,
      g: null,
      forceProperties: {
          center: {
            x: 0.5,
            y: 0.5
          },
          collide: {
            enabled: true,
            strength: .7,
            iterations: 1,
            radius: 35
          },
          forceX: {
            enabled: false,
            strength: .7,
          },
          forceY: {
            enabled: false,
            strength: .7,
          },
        },
    };
  },
  store,
  mounted() {
    this._data = accidentData;
    this.init();
  },
  methods: {

    init() {
      this.render();
      this.listeners();
    },
    render() {

      let projection = this.getProjection();

      /* let path = this.path = d3.geoPath().projection(projection); */

      let svg = this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append("svg")
        .attr("id", "test_svg")
        //.attr("class", "mapboxgl-canvas-container mapboxgl-interactive mapboxgl-touch-zoom-rotate mapboxgl-touch-drag-pan")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight)
        //.call(d3zoom);

      /* this.simulation = d3
        .forceSimulation().nodes(this._data.accidents)
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX(d => {
          return d.X;
        }))
        .force("forceY", d3.forceY(d => {
          return d.Y;
        }))
        .on("tick", this.tick); */

      //let g = this.g = svg.append("g");
      /* let feature = g
        .selectAll("path")
        .data(this._data.accidents)
        .enter().append("path")
        .attr("d", path);  */

      //this.updateForces();

      this.graph = svg
          .append("g")
          .selectAll("circle")
          .data(this._data.accidents)
          .enter().append("circle")
          .attr("r", 5)
          .attr("cx", d => {
            d.pos = projection([d.X, d.Y]);
            return d.pos[0];
            //return this.mapboxProjection([d.X, d.Y])[0];
          })
          .attr("cy", d => {
            return d.pos[1];
            //return this.mapboxProjection([d.X, d.Y])[1];
          })
          .attr("class", "nodes")
          //.call(d3zoom)
          .on("click", function() {
            console.log(this);
            //d3.select(this).remove();
          });

    },
    updateD3() {

      this.svg.attr("width", window.innerWidth)
              .attr("height", window.innerHeight)

      let projection = this.getProjection();
      this.graph
          .attr("r", 5 /* / event.transform.k + "px" */)
          .attr("cx", d => {
            d.pos = projection([d.X, d.Y]);
            //d.pos = this.mapboxProjection([d.X, d.Y]);
            return d.pos[0];
          })
          .attr("cy", d => {
            return d.pos[1];
          })
          //.select(".nodes").style("stroke-width", 5 / d3.event.transform.k + "px");
    },
    tick() {
        const transform = d => {
          return "translate(" + d.x + "," + d.y + ")";
        }
        this.graph.selectAll("circle").attr("transform", transform);
    },
    mapboxProjection(lonlat) {
      let p = this.$store.state.map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]))
      return [p.x, p.y];
    },
    getProjection() {
      let bbox = document.body.getBoundingClientRect();
      let center = this.$store.state.map.getCenter();
      let zoom = this.$store.state.map.getZoom();
      // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
      let scale = (512) * 0.5 / Math.PI * Math.pow(2, zoom);
      let d3projection = d3.geoMercator()
        .center([center.lng, center.lat])
        .translate([window.innerWidth / 2, window.innerHeight / 2]/* [bbox.width/2, bbox.height/2] */)
        .scale(scale)
        //.scale((1 << 21) / (2 * Math.PI)) //https://observablehq.com/@mbostock/d3-vector-tiles //
        //.precision(0);
      return d3projection;
    },
    updateForces() {
    },
    listeners() {
      this.$root.$on('map-zoom', d => { 
        //this.update();     
        this.updateD3();
      });
      this.$root.$on('map-move', d => {
        this.updateD3();
        //this.update()
      });
      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    },
    update() {
      d3.selectAll("g").selectAll("circle").remove();
      this.render();
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
