<template>
  <div>
    <svg ></svg>
    <TestComponent :cx="200" :cy="100"></TestComponent>
    <!-- <a class="button is-dark" style="position:absolute" @click="moveMe">Button</a> -->
  </div>
</template>

<script>
import * as d3 from "d3";
import store from "../store.js";
import accidentData from "../data/nehody2018.js";
import TestComponent from "./TestComponent.vue";

export default {
  name: "Visualization",
  components: {
    TestComponent
  },
  data() {
    return {
      testx: 0,
      testy: 0,
      oneAccident: null,
      _data: null,
      graph: null,
      simulation: null,
      forceProperties: {
          center: {
            x: 0.5,
            y: 0.5
          },
          charge: {
            enabled: true,
            strength: -300,
            distanceMin: 1,
            distanceMax: 2000
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
    /* console.log(this._data);
    console.log(this._data.accidents[33]); */
    // this.loadData();
    this.init();
    this.testx=50;
    this.testy=50;
    oneAccident = {
      "OBJECTID": 1260,
      "DruhNehody": "Srážka s jedoucím nekolejovým vozidlem",
      "HlavniPricina": "Nedání přednosti v jizdě",
      "Zavineni": "Řidičem motorového vozidla",
      "Datum": "1/1/2018",
      "Den": "Pondělí",
      "DenNoc": "Noc",
      "Alkohol": "Ne",
      "Usmrceno": 0,
      "Tezce": 0,
      "Lehce": 1,
      "StavPovrchu": "Mokrý",
      "Pocasi": "Neztížené",
      "SpecifikaceMista": "Přechod pro chodce nebo v jeho blízkosti",
      "DruhVozidla": "Osobní automobil",
      "Smyk": "Ne",
      "Skoda": 60000,
      "X": 16.61599368,
      "Y": 49.1963041400001,
      "x": 1849683.9554818554,
      "y": 6308235.978302982
    }
  },
  methods: {
    // async loadData() {
    //   const ddata = await d3.csv("./data/Nehody2018.csv");
    //   console.log(ddata);
    //   this._data = ddata;
    // },
    init() {
      this.render();
    },
    moveMe() {
      console.log(this.testx, this.testy)
      this.testx += 50;
      this.testy -= 30;
      console.log("haha", this.testx, this.testy)
    },
    render() {

      let d3zoom = d3.zoom().scaleExtent([3, 22]).on("zoom", () => {
        //this.updateD3();
      });

      let svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append("svg")
        /* .select(this.$el) */
        .attr("id", "test_svg")
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

      

      //this.updateForces();
//.mapboxProjection();//
      let projection = this.getProjection();/*d3.geoMercator().translate([window.innerWidth / 2, window.innerHeight / 2]).fitSize([window.innerWidth, window.innerHeight], {
                        //  type: "Sphere"
                        //});;*/

      this.graph = svg
          .append("g")
          .selectAll("circle")
          .data(this._data.accidents)
          .enter().append("circle")
          .attr("r", 5)
          .attr("cx", d => {
            //console.log(projection([d.X, d.Y])[0]);
            //return projection([d.X, d.Y])[0];
            d.pos = projection([d.X, d.Y]);
            return d.pos[0];
            //return this.mapboxProjection([d.X, d.Y])[0];
          })
          .attr("cy", d => {
            //return projection([d.X, d.Y])[1];
            return d.pos[1];
            //return this.mapboxProjection([d.X, d.Y])[1];
          })
          .attr("class", "nodes")
          //.call(d3zoom)
          .on("click", function() {
            console.log(this);
            //d3.select(this).remove();
          });


      this.simulation = d3
        .forceSimulation(this.graph)
        .force("center", d3.forceCenter(0.5, 0.5))
        
        .force("collide", d3.forceCollide(5).radius(10)
          .strength(1)
          
          .iterations(1))
        /* .force("forceX", d3.forceX(d => {
          return 2000;
        }).strength(1))
        .force("forceY", d3.forceY(d => {
          return 500;
        }).strength(1)) */
        //.on("tick", this.tick);

        //this.simulation

      /* this.graph.call(d3.zoom()
              //.scaleExtent([3, 22])
              .on("zoom", () => {
                this.updateD3();
                //.attr("transform", d3.event.transform);
                  })); */
    },
    updateD3() {
      let projection = this.getProjection();

      this.graph.select("g")
      .selectAll("circle")
          //.data(this._data.accidents)
          //.enter().append("circle")
          .attr("r", 5 / d3.event.transform.k + "px")
          .attr("cx", d => {
            //console.log(projection([d.X, d.Y])[0]);
            d.pos = projection([d.X, d.Y]);
            //d.pos = this.mapboxProjection([d.X, d.Y]);
            return d.posX[0];
          })
          .attr("cy", d => {
            //return projection([d.X, d.Y])[1];
            //return this.mapboxProjection([d.X, d.Y])[1];
            return d.pos[1];
          })
          //.attr("transform", d => { return "translate(" + d.pos + ")" })
          .attr("transform", d3.event.transform)
          //.select(".nodes").style("stroke-width", 5 / d3.event.transform.k + "px");
    },
    tick() {
        const transform = d => {
          return "translate(" + d.x + "," + d.y + ")";
        }
        this.graph.selectAll("circle").attr("transform", transform);
    },
    mapboxProjection(lonlat) {
      var p = this.$store.state.map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]))
      return [p.x, p.y];
    },
    getProjection() {
      var bbox = document.body.getBoundingClientRect();
      var center = this.$store.state.map.getCenter();
      var zoom = this.$store.state.map.getZoom();
      // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
      var scale = (512) * 0.5 / Math.PI * Math.pow(2, zoom);
      var d3projection = d3.geoMercator()
        .center([center.lng, center.lat])
        .translate([window.innerWidth / 2, window.innerHeight / 2]/* [bbox.width/2, bbox.height/2] */)
        //.scale(scale)
        .scale((1 << 21) / (2 * Math.PI)) //https://observablehq.com/@mbostock/d3-vector-tiles
        .precision(0);
      return d3projection;
    },
    updateForces() {
    },
    listeners() {
      this.$root.$on('map-zoom', d => { console.log("zoom"); this.updateD3(); })
      this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
      this.$root.$on('map-move', d => { console.log("move"); this.updateD3(); })
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
  position: relative;
}
</style>
