<template>
  <svg></svg>
</template>

<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/nehody2018.js'

export default {
  name: 'VisualizationCircles',
  data() {
    return {
      dataVisualization: [],
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
          strength: 0.7,
          iterations: 1,
          radius: 35
        },
        forceX: {
          enabled: false,
          strength: 0.7
        },
        forceY: {
          enabled: false,
          strength: 0.7
        }
      }
    }
  },
  store,
  mounted() {
    //this.loadData()
    this.dataVisualization = accidentData
    this.init()
  },
  methods: {
    loadData() {
      /* Object.defineProperty(this.dataObject, 'nested', {
        configurable: false
      }) */
      /* Object.defineProperty(this.dataObject.actualData, 'nested', {
        configurable: false
      }) */
      d3.csv('./data/Nehody2018.csv')
        .then(data => {
          //d3.csv
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
          data.forEach(o => Object.freeze(o))
          this.$store.dispatch('loadData', data)
          this.dataVisualization = data
        })
        .catch(error => {
          console.error('Could not read the file.', error)
        })
      console.log('acc', accidentData.accidents)
      //this.dataVisualization = Object.freeze(this.$store.state.dataset)
      //this.dataVisualization = this.$store.state.dataset
      console.log('lel', this.dataVisualization)
      console.log('cmon', this.$store.state.datasetObject)
      console.log('cmonnnn', this.$store.state.datasetObject.dataset)
      console.log(
        'cmonnnn',
        this.$store.state.datasetObject.dataset.__ob__.value
      )
    },
    init() {
      this.render()
      this.listeners()
    },
    render() {
      let projection = this.getProjection()

      /* let path = this.path = d3.geoPath().projection(projection); */

      let svg = (this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('svg')
        .attr('id', 'test_svgg')
        //.attr("class", "mapboxgl-canvas-container mapboxgl-interactive mapboxgl-touch-zoom-rotate mapboxgl-touch-drag-pan")
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight))
      //.call(d3zoom);

      //let g = this.g = svg.append("g");
      /* let feature = g
        .selectAll("path")
        .data(this.dataVisualization.accidents)
        .enter().append("path")
        .attr("d", path);  */

      //this.updateForces();

      this.graph = svg
        .append('g')
        .selectAll('circle')
        .data(this.dataVisualization.accidents)
        //.data(this.dataVisualization)
        .enter()
        .append('circle')
        .attr('r', 5)
        .attr('cx', d => {
          d.pos = projection([d.X, d.Y])
          return d.pos[0]
          //return this.mapboxProjection([d.X, d.Y])[0];
        })
        .attr('cy', d => {
          return d.pos[1]
          //return this.mapboxProjection([d.X, d.Y])[1];
        })
        .attr('class', 'nodess')
        //.call(d3zoom)
        .on('click', function() {
          console.log(this)
          //d3.select(this).remove();
        })

      /* this.simulation = d3
        .forceSimulation()
        .nodes(this.graph)
        //.forceSimulation(this.graph)
        .force(
          'center',
          d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2)
        )
        .force(
          'collide',
          d3
            .forceCollide()
            .radius(1000)
            .strength(1)
            .iterations(1)
        )
        .force(
          'forceX',
          d3.forceX(d => {
            d.pos = projection([d.X, d.Y])
            return d.pos[0]
            //return d.X;
          })
        )
        .force(
          'forceY',
          d3.forceY(d => {
            return d.pos[1]
            //return d.Y;
          })
        )
        .on('tick', this.tick)
      this.simulation.alpha(1).restart() */
    },
    updateD3() {
      this.svg
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

      let projection = this.getProjection()

      //console.log(projection.scale())
      this.graph
        .attr(
          'r',
          5
          /* / event.transform.k + "px" */
          /* * this.$store.state.map.getZoom() / 5 */
        )
        .attr('cx', d => {
          d.pos = projection([d.X, d.Y])
          //d.pos = this.mapboxProjection([d.X, d.Y]);
          return d.pos[0]
        })
        .attr('cy', d => {
          return d.pos[1]
        })
      //.select(".nodes").style("stroke-width", 5 / d3.event.transform.k + "px");
    },
    tick() {
      const transform = d => {
        return 'translate(' + d.x + ',' + d.y + ')'
      }

      //d3.selectAll('circle').attr('transform', d => 'translate(' + d.x + "," + d.y + ")")
      //this.graph.attr('transform', d => 'translate(' + d.x + "," + d.y + ")")

      //this.graph.selectAll("circle").attr("transform", transform);
      //this.graph.attr("transform", transform);
      /* this.graph.attr('cx', function (d) { return d.x })
                  .attr('cy', function (d) { return d.y }) */
    },
    mapboxProjection(lonlat) {
      let p = this.$store.state.map.project(
        new mapboxgl.LngLat(lonlat[0], lonlat[1])
      )
      return [p.x, p.y]
    },
    getProjection() {
      //let bbox = document.body.getBoundingClientRect()
      let center = this.$store.state.map.getCenter()
      let zoom = this.$store.state.map.getZoom()
      // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
      let scale = ((512 * 0.5) / Math.PI) * Math.pow(2, zoom)
      let d3projection = d3
        .geoMercator()
        .center([center.lng, center.lat])
        .translate(
          [
            window.innerWidth / 2,
            window.innerHeight / 2
          ] /* [bbox.width/2, bbox.height/2] */
        )
        .scale(scale)
      //.scale((1 << 21) / (2 * Math.PI)) //https://observablehq.com/@mbostock/d3-vector-tiles //
      //.precision(0);
      return d3projection
    },
    updateForces() {},
    listeners() {
      this.$root.$on('map-zoom', d => {
        //this.update();
        this.updateD3()
      })
      this.$root.$on('map-move', d => {
        this.updateD3()
        //this.update()
      })
      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    },
    update() {
      d3.selectAll('g')
        .selectAll('circle')
        .remove()
      this.render()
    }
  }
}
</script>

<style>
.nodess {
  fill: 'black';
  stroke: #fff;
  stroke-width: 2px;
}

#test_svgg {
  position: relative;
}
</style>
