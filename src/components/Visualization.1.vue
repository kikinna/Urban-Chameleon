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
  },
  methods: {
    // async loadData() {
    //   const ddata = await d3.csv("./data/Nehody2018.csv");
    //   console.log(ddata);
    //   this._data = ddata;
    // },
    init() {
      this.render();
      this.listeners();
      //this.addVizLayer();
    },
    addVizLayer() {

    },
    render() {

      let d3zoom = d3.zoom().scaleExtent([3, 22]).on("zoom", () => {
        //this.updateD3();
      });

      let projection = this.getProjection();

      let path = this.path = d3.geoPath().projection(projection);

      let svg = this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append("svg")
        .attr("id", "test_svg")
        //.attr("class", "mapboxgl-canvas-container mapboxgl-interactive mapboxgl-touch-zoom-rotate mapboxgl-touch-drag-pan")
        //.attr("width", window.innerWidth)
        //.attr("height", window.innerHeight)
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


      let g = this.g = svg.append("g");
      /* let feature = g
        .selectAll("path")
        .data(this._data.accidents)
        .enter().append("path")
        .attr("d", path);  */

      //this.updateForces();

      this.pls();


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


      /* this.simulation = d3
        .forceSimulation(this.graph)
        .force("center", d3.forceCenter(0.5, 0.5))
        
        .force("collide", d3.forceCollide(5).radius(10)
          .strength(1)
          
          .iterations(1)) */
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

      this.graph.selectAll("g")
      .selectAll("circle")
          //.data(this._data.accidents)
          //.enter().append("circle")
          //.attr("r", 5 / event.transform.k + "px")
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
          //.attr("event.", d => { return "translate(" + d.pos + ")" })
          //.attr("transform", event.transform)
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
        //.scale((1 << 21) / (2 * Math.PI)) //https://observablehq.com/@mbostock/d3-vector-tiles //0 22
        //.precision(0);
      return d3projection;
    },
    updateForces() {
    },
    listeners() {
      this.$root.$on('map-zoom', d => { 
        this.updateD3();
        this.pls();
        console.log("d", d)
        this.update(d.getZoom());
      });
      this.$root.$on('move', d => {
        this.updateD3();
        this.pls();
        
      });
      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    },
    update(zoom) {
      this.svg.selectAll("g").selectAll("circle").attr("transform", "translate(" + bbox.left/* -topLeft[0] */ + "," + bbox.top/* -topLeft[1] */ + ")");
    },
    pls() {

      /* let coords = [];

      this._data.accidents.forEach(d => {
        //xCoords.push(d.X);
        //yCoords.push(d.Y);
        coords.push([d.X, d.Y]);
      }); */

      //console.log(coords)
      //console.log(this.path.bounds(coords))

        /* let bounds = this.path.bounds(coords),
          topLeft = bounds[0],
          bottomRight = bounds[1]; */

        let bbox = document.body.getBoundingClientRect();
        console.log(bbox)
      
      this.svg.attr("width", window.innerWidth)
          .attr("height", window.innerHeight)
          //.style("left",  + "px")
          //.style("top",  + "px");

        // this.svg.attr("width", bbox.width/* bottomRight[0] - topLeft[0] */)
        //   .attr("height", bbox.height * 10/* bottomRight[1] - topLeft[1] */)
        //   .style("left", bbox.left/* topLeft[0] */ + "px")
        //   .style("top", bbox.top/* topLeft[1] */ + "px");

        //this.svg.selectAll("g").selectAll("circle").attr("transform", "translate(" + bbox.left/* -topLeft[0] */ + "," + bbox.top/* -topLeft[1] */ + ")");
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
