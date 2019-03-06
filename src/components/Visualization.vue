<template>
  <svg></svg>
</template>

<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/nehody2018.js'

export default {
  name: 'Visualization',
  data() {
    return {
      dataVisualization: [],
      graph: null,
      simulation: null,
      path: null,
      svg: null,
      nodes: null,
      nodeRadius: 5,
      forceProperties: {
        collide: {
          enabled: true,
          strength: 0.7,
          iterations: 1,
          radius: 35
        },
        forceX: {
          enabled: true,
          strength: 0.7
        },
        forceY: {
          enabled: true,
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

      let drag = d3
        .drag()
        .on('start', this.dragStarted)
        .on('drag', this.dragged)
        .on('end', this.dragEnded)

      let svg = (this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('svg')
        .attr('id', 'test_svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight))
      //.call(d3zoom);

      this.graph = accidentData

      //let center = this.$store.state.map.getCenter()

      this.simulation = d3
        .forceSimulation()
        .nodes(this.graph.accidents)
        /* .force(
          'center',
          //d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2)
          d3.forceCenter(center.lng, center.lat)
        ) */
        .force(
          'charge',
          d3.forceManyBody().strength(-50 /* -6 * this.nodeRadius */)
        )
        .force(
          'collide',
          d3
            .forceCollide()
            .radius(2 * this.nodeRadius)
            .strength(1)
            .iterations(1)
        )
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = projection([d.X, d.Y])
              return d.pos[0]
            })
            .strength(0.7)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(0.7)
        )
        .on('tick', this.tick)

      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      this.nodes = svg
        .append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(this.graph.accidents)
        .enter()
        .append('circle')
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          return colorScale(d.DruhNehody)
        })
        .attr('cx', d => {
          d.pos = projection([d.X, d.Y])
          d.x = d.pos[0] //TODO: are we sure we don't need these data?
          return d.pos[0]
          //return this.mapboxProjection([d.X, d.Y])[0];
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
          //return this.mapboxProjection([d.X, d.Y])[1];
        })
        .call(drag)

      //this.simulation.alphaTarget(1).restart()
    },
    updateD3() {
      this.svg
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

      let projection = this.getProjection()

      this.nodes
        .attr('cx', function(d) {
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        })
      /* .attr('cx', function(d) {
          d.pos = projection([d.X, d.Y])
          return d.pos[0]
        })
        .attr('cy', function(d) {
          return d.pos[1]
        }) */

      this.simulation
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = projection([d.X, d.Y])
              return d.pos[0]
              //return d.X;
            })
            .strength(0.7)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
              //return d.Y;
            })
            .strength(0.7)
        )

      this.simulation.alphaTarget(0.3).restart()
    },
    tick() {
      this.nodes
        .attr('cx', function(d) {
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        })
      /* .attr('cx', function(d) {
          d.pos = projection([d.X, d.Y])
          return d.pos[0]
        })
        .attr('cy', function(d) {
          return d.pos[1]
        }) */

      //this.simulation.alphaTarget(1).restart()
    },
    dragStarted(d) {
      this.simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    },
    dragged(d) {
      d.fx = d3.event.x
      d.fy = d3.event.y
    },
    dragEnded(d) {
      this.simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
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
      this.$root.$on('map-zoom', () => {
        this.updateD3()
      })
      this.$root.$on('map-move', () => {
        this.updateD3()
      })
      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    }
  }
}
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
