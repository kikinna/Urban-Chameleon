<template>
  <div
    style="background-color:white; position:relative; visibility: hidden;"
    @click.left="calculateDistanceDeviation"
    @click.right.prevent="simulation.restart"
  >
    <svg></svg>
  </div>
</template>

<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/nehody2018.js'
import WebMercatorViewport from 'viewport-mercator-project'

export default {
  name: 'Visualization',
  data() {
    return {
      dataD3: [],
      initialised: false,
      graph: null,
      simulation: null,
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
      },
      curr_zoom: 0
    }
  },
  store,
  mounted() {
    //this.loadData()
    this.dataD3 = accidentData
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
          //data.forEach(o => Object.freeze(o))
          this.$store.dispatch('loadData', data)
          this.dataD3 = data
        })
        .catch(error => {
          console.error('Could not read the file.', error)
        })
    },
    init() {
      this.render()
      this.listeners()
    },
    render() {
      let projection = this.getProjection()
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      let drag = d3
        .drag()
        .on('start', this.dragStarted)
        .on('drag', this.dragged)
        .on('end', this.dragEnded)

      this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('svg')
        .attr('id', 'test_svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

      const t = d3
        .transition()
        .duration(750)
        .ease(d3.easeLinear)

      this.nodes = this.svg
        .append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(this.dataD3.accidents)
        .enter()
        .append('circle')
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          if (d.tooFar) {
            return 'red'
          }
          return 'black' //return colorScale(d.DruhNehody)
        })
        .attr('cx', d => {
          d.pos = projection([d.X, d.Y])
          d.x = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
        })

      //.call(drag)

      this.calculateDistanceDeviation()

      this.simulation = d3
        .forceSimulation()
        .nodes(this.dataD3.accidents)
        .force(
          'collide',
          d3
            .forceCollide()
            .radius(this.nodeRadius * 2)
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

      //this.simulation.alpha(1).restart()
    },
    updateD3() {
      this.svg
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

      let projection = this.getProjection()

      /* this.nodes
        .attr('cx', function(d) {
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        }) */
      /* .attr('cx', function(d) {
          d.pos = projection([d.X, d.Y])
          return d.pos[0]
        })
        .attr('cy', function(d) {
          return d.pos[1]
        }) */
      //this.calculateDistanceDeviation()

      this.simulation
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

      this.simulation.alpha(0.3).restart()
    },
    tick() {
      this.calculateDistanceDeviation()

      /* let zoom = this.$store.state.map.getZoom()
      if (Math.abs(zoom - this.curr_zoom) > 0.001) {
        // console.log(zoom);
        this.curr_zoom = zoom
      } */
      let projection = this.getProjection()

      this.simulation
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

      /* d3.selectAll('nodes').attr(
        'transform',
        d => 'translate(' + d.x + ',' + d.y + ')'
      ) */

      const t = d3
        .transition()
        //.duration(0)
        .ease(d3.easeLinear)

      this.nodes
        .transition(t)
        //d3.selectAll('.nodes')
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

      //this.simulation.alpha(1).restart()
      // this.calculateDistanceDeviation();
    },
    dragStarted(d) {
      // this.simulation.alpha(0.3).restart()
      this.simulation.restart()
      d.fx = d.x
      d.fy = d.y
    },
    dragged(d) {
      d.fx = d3.event.x
      d.fy = d3.event.y
    },
    dragEnded(d) {
      //this.simulation.alpha(0)
      this.simulation.stop(0)
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
    getViewport() {
      const center = this.$store.state.map.getCenter()
      const zoom = this.$store.state.map.getZoom()
      const pitch = this.$store.state.map.getPitch()
      const bearing = this.$store.state.map.getBearing()

      const viewport = new WebMercatorViewport({
        longitude: center.lng,
        latitude: center.lat,
        zoom: zoom,
        width: window.innerWidth,
        height: window.innerHeight,
        pitch: pitch,
        bearing: bearing
      })
      /* const viewport = new WebMercatorViewport({ //test values
        width: 800,
        height: 600,
        longitude: -122.45,
        latitude: 37.78,
        zoom: 12,
        pitch: 60,
        bearing: 30
      })
      console.log('1', viewport.project([-122.45, 37.78]))
      // returns pixel coordinates [400, 300]
      console.log('2', viewport.unproject([400, 300]))
      // returns map coordinates [-122.45, 37.78] */
      return viewport
    },
    worldToLngLat() {
      const projection = this.getProjection()
      console.log('49.2153206, 16.6001003')
      const A = projection([49.2153206, 16.6001003])
      console.log('world coords: ', A)
      const viewport = this.getViewport()
      const vpA = viewport.unproject(A)
      console.log('lonlat: ', vpA)
    },
    calculateDistanceDeviation() {
      let projection = this.getProjection()
      //this.simulation.stop()
      this.dataD3.accidents.forEach(d => {
        let A = projection([49.2153206, 16.6001003])
        //let A = this.mapboxProjection([49.2153206, 16.6001003])
        let B = projection([49.2141556, 16.6008667])
        //let B = this.mapboxProjection([49.2141556, 16.6008667])
        let test_dist =
          Math.sqrt(Math.pow(A[0] - B[0], 2) * Math.pow(A[1] - B[1], 2)) / 10
        // if (d.index == 3) { console.log(test_dist) }
        d.pos = projection([d.X, d.Y])
        // console.log(d.index, d.X, d.Y, d.pos[0], d.pos[1]);
        let distX = d.pos[0] - d.x
        let distY = d.pos[1] - d.y
        d.vzdalenost = Math.sqrt(distX * distX + distY * distY)
        // console.log(distX, distY, d.dist);
        d.tooFar = d.vzdalenost > test_dist
        // if (d.tooFar) {
        //   // console.log(d);
        // }
      })

      this.nodes.attr('fill', d => {
        if (d.tooFar) {
          //console.log(d.tooFar)
          return 'red'
        }
        return 'black'
      })
      //this.simulation.alpha(0.3).restart()
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.updateD3()
        this.worldToLngLat()
      })
      this.$root.$on('map-move', () => {
        this.updateD3()
      })
      //just end events
      this.$root.$on('map-zoomend', () => {
        //this.simulation.alphaTarget(0)
        this.calculateDistanceDeviation()
      })
      this.$root.$on('map-moveend', () => {
        this.calculateDistanceDeviation()
      })

      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    }
  },
  computed: {
    computedForceLayout: function() {
      if (this.simulation) {
        const projection = this.getProjection()

        this.simulation
          .force(
            'forceX',
            d3
              .forceX(d => {
                d.pos = projection([d.X, d.Y])
                // console.log(d.pos);
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
      }

      return this.simulation
    },
    computedSvg: function() {
      if (this.svg) {
        this.svg
          .attr('width', window.innerWidth)
          .attr('height', window.innerHeight)
      }

      return this.svg
    },

    computedNodes: function() {
      if (this.nodes) {
        //const colorScale = d3.scaleOrdinal(d3.schemeDark2)
        const projection = this.getProjection()

        this.nodes
          .attr('r', this.nodeRadius)
          .attr('fill', d => {
            if (d.tooFar) {
              return 'red'
            }
            return 'black' //return colorScale(d.DruhNehody)
          })
          .attr('cx', d => {
            d.pos = projection([d.X, d.Y])
            d.x = d.pos[0]
            return d.pos[0]
          })
          .attr('cy', d => {
            d.y = d.pos[1]
            return d.pos[1]
          })
      }

      return this.nodes
    }
  }
}
</script>

<style>
.nodes {
  stroke: #fff;
  stroke-width: 2px;
}

#test_svg {
  position: relative;
}
</style>
