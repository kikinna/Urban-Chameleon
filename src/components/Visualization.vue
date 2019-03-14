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
      cells: [],
      firstParty: [],
      partyNodes: null,
      partySimulation: null,
      initialised: false,
      graph: null,
      simulation: null,
      svg: null,
      nodes: null,
      nodeRadius: 5,
      forceProperties: {
        collide: {
          enabled: true,
          strength: 1,
          iterations: 1,
          radius: 35
        },
        forceX: {
          enabled: true,
          strength: 1
        },
        forceY: {
          enabled: true,
          strength: 1
        }
      },
      curr_zoom: 0,
      distanceLimit: 0.000001
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
      const viewport = this.getViewport()
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      //let drag = d3.drag().on('start', this.dragStarted).on('drag', this.dragged).on('end', this.dragEnded)

      this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('svg')
        .attr('id', 'test_svg')
        .attr('width', this.computedWidth)
        .attr('height', this.computedHeight)

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
          d.pos = viewport.project([d.X, d.Y])
          // d.pos = projection([d.X, d.Y])
          d.x = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
        })
        .on('click', d => {
          /* console.log(
            'deviation',
            d.deviation,
            ' but is it too far? ',
            d.tooFar
          ) */
          // this.calculateDistanceDeviation()
        })

      //.call(drag)

      // this.calculateDistanceDeviation()

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
              d.pos = viewport.project([d.X, d.Y])
              // d.pos = projection([d.X, d.Y])
              return d.pos[0]
            })
            .strength(1)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(1)
        )
        .on('tick', this.tick)
      //.on('end', this.end)

      //this.simulation.alpha(1).restart()
    },
    updateD3() {
      // this.svg
      //   .attr('width', this.computedWidth)
      //   .attr('height', this.computedHeight)
      const viewport = this.getViewport()

      this.nodes
        .attr('cx', function(d) {
          d.x = viewport.project(d.forceGPS)[0]
          return d.x
        })
        .attr('cy', function(d) {
          d.y = viewport.project(d.forceGPS)[1]
          return d.y
        })

      //this.calculateDistanceDeviation()

      this.simulation
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = viewport.project([d.X, d.Y])
              // d.pos = projection([d.X, d.Y])
              return d.pos[0]
            })
            .strength(1)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(1)
        )

      this.simulation.alpha(0.1).restart()
    },
    tick() {
      // console.log('simulation tick')
      // console.log('alpha', this.simulation.alpha()*100)
      // this.calculateDistanceDeviation()
      const viewport = this.getViewport()
      // this.simulation.force('forceX',d3.forceX(d => {d.pos = viewport.project([d.X, d.Y])
      //         // d.pos = projection([d.X, d.Y])
      //         return d.pos[0]}).strength(1))
      //   .force('forceY',d3.forceY(d => {return d.pos[1]}).strength(1))

      this.nodes
        .attr('cx', function(d) {
          d.forceGPS = viewport.unproject([d.x, d.y])
          // if (d.OBJECTID == 1260) {
          //   console.log(d.forceGPS[0]-d.X, d.forceGPS[1]-d.Y)
          // }
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        })
    },
    end() {
      this.calculateDistanceDeviation()
      console.log('simulation end')
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
    getProjection() {
      let bbox = document.body.getBoundingClientRect()
      let center = this.$store.state.map.getCenter()
      let zoom = this.$store.state.map.getZoom()
      // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
      let scale = ((512 * 0.5) / Math.PI) * Math.pow(2, zoom)
      let d3projection = d3
        .geoMercator()
        .center([center.lng, center.lat])
        .translate([this.computedWidth / 2, this.computedHeight / 2])
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
        width: this.computedWidth,
        height: this.computedHeight,
        pitch: pitch,
        bearing: bearing
      })
      return viewport
    },
    measureGeoDistance(lat1, lon1, lat2, lon2) {
      // generally used geo measurement function
      var R = 6378.137 // Radius of earth in KM
      var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180
      var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      var d = R * c
      return d * 1000 // meters
    },
    initGrid(arrayLength) {
      const GRID_SIZE = 25
      const GRID_COLS = 6
      const GRID_ROWS = Math.ceil(arrayLength / GRID_COLS)

      const cells = []

      for (var c = 0; c < GRID_COLS; c++) {
        for (var r = 0; r < GRID_ROWS; r++) {
          var cell
          cell = {
            x: c * GRID_SIZE,
            y: r * GRID_SIZE,
            occupied: false
          }
          cells.push(cell)
        }
      }

      this.cells = cells
    },
    sqdist(a, b) {
      return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
    },
    occupyNearest(p) {
      var minDist = 1000000
      var d
      var candidate = null
      for (var i = 0; i < this.cells.length; i++) {
        if (
          !this.cells[i].occupied &&
          (d = this.sqdist(p, this.cells[i])) < minDist
        ) {
          minDist = d
          candidate = this.cells[i]
        }
      }
      if (candidate) candidate.occupied = true
      return candidate
    },
    housePartyAreas() {
      //this.simulation.stop()
      const latlon1 = [16.59512715090524, 49.20013082305056]
      //const latlon2 = [16.595096320004444, 49.19380583417316]
      const latlon3 = [16.605566189434686, 49.19358091860195]
      //const latlon4 = [16.605512948005973, 49.19883456531343]

      this.firstParty = this.computedFirstPartyData

      const viewport = this.getViewport()

      this.initPartyForceSimulation(
        viewport.project(latlon1),
        viewport.project(latlon3)
      )
    },
    initPartyForceSimulation(latlon1, latlon3) {
      this.partySimulation = d3
        .forceSimulation(this.computedFirstPartyData)
        .force(
          'center',
          d3.forceCenter(
            window.innerWidth / 2,
            window.innerHeight / 2
            /* (latlon1[0] + latlon3[0]) / 2,
            (latlon1[1] + latlon3[1]) / 2 */
          )
        )
      // .force('forceX', d3.forceX(window.innerWidth / 2).strength(1))
      // .force('forceY', d3.forceY(window.innerHeight / 2).strength(1))

      const shiftX = (latlon1[0] + latlon3[0]) / 2 //window.innerWidth / 2
      const shiftY = (latlon1[1] + latlon3[1]) / 2 //window.innerHeight / 2

      console.log('shift', shiftX, shiftY)

      this.partyNodes = this.svg
        .append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(this.computedFirstPartyData)
        .join('circle')
        .attr('class', 'partyCircles')
        .attr('r', 5)
        .attr('fill', 'blue')

      this.partySimulation.on('tick', () => {
        this.initGrid(this.computedFirstPartyData.length)
        console.log('ticked', this.computedFirstPartyData.length)

        this.partyNodes
          .each(d => {
            let gridpoint = this.occupyNearest(d)
            if (gridpoint) {
              // ensures smooth movement towards final positoin
              // d.x += (gridpoint.x - d.x) * 0.05
              // d.y += (gridpoint.y - d.y) * 0.05

              // jumps directly into final position
              d.x = gridpoint.x
              d.y = gridpoint.y
            }
            //console.log(d)
          })
          .attr('cx', d => d.x + shiftX)
          .attr('cy', d => d.y + shiftY)
      })
    },
    calculateDistanceDeviation() {
      const viewport = this.getViewport()
      this.dataD3.accidents.forEach(d => {
        const unshiftedCoords = [d.X, d.Y]
        const currentCoords = viewport.unproject(d.pos)

        const distanceInMeters = this.measureGeoDistance(
          unshiftedCoords[0],
          unshiftedCoords[1],
          currentCoords[0],
          currentCoords[1]
        )
        d.deviation = distanceInMeters
        d.tooFar = distanceInMeters > this.distanceLimit //0.000001 // currentDistance > 0.000000001 //this.distanceLimit
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
      this.$root.$on('map-zoomend', () => {
        this.updateD3()

        // console.log('zoomed',  this.$store.state.map.getZoom())
        //this.worldToLngLat()
      })
      this.$root.$on('map-move', () => {
        this.updateD3()
        // console.log('moved')
      })
      //just end events
      this.$root.$on('map-zoomend', () => {
        // console.log('zoomend')
        //this.simulation.alphaTarget(0)
        /* this.calculateDistanceDeviation() //testing

        const A = [49.2153206, 16.6001003]
        const B = [49.2141556, 16.6008667]

        const distanceInMeters = this.measureGeoDistance(A[0], A[1], B[0], B[1])
        console.log('test distanceInMeters', distanceInMeters) */
        /* this.dataD3.accidents.forEach(d => {
          console.log(
            'deviation',
            d.deviation,
            ' but is it too far? ',
            d.tooFar
          )
        }) */
      })
      this.$root.$on('map-moveend', () => {
        //console.log('map moveend')
      })
      this.$root.$on('map-movestart', () => {
        //console.log('map movestart')
      })
      this.$root.$on('map-zoomstart', () => {
        //console.log('map zoom START', this.$store.state.map.getZoom())
      })
      this.$root.$on('map-zoomend', () => {
        //console.log('map zoom END', this.$store.state.map.getZoom())
      })
      this.$root.$on('map-click', () => {
        this.housePartyAreas()
      })

      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    }
  },
  computed: {
    computedForceLayout: function() {
      if (this.simulation) {
        const projection = this.getProjection()
        const viewport = this.getViewport()

        this.simulation
          .force(
            'forceX',
            d3
              .forceX(d => {
                d.pos = viewport.project([d.X, d.Y])
                // d.pos = projection([d.X, d.Y])
                // console.log(d.pos);
                return d.pos[0]
              })
              .strength(1)
          )
          .force(
            'forceY',
            d3
              .forceY(d => {
                return d.pos[1]
              })
              .strength(1)
          )
      }

      return this.simulation
    },
    computedSvg: function() {
      if (this.svg) {
        this.svg
          .attr('width', this.computedWidth)
          .attr('height', this.computedHeight)
      }

      return this.svg
    },

    computedNodes: function() {
      if (this.nodes) {
        //const colorScale = d3.scaleOrdinal(d3.schemeDark2)
        const projection = this.getProjection()
        const viewport = this.getViewport()

        this.nodes
          .attr('r', this.nodeRadius)
          .attr('fill', d => {
            if (d.tooFar) {
              return 'red'
            }
            return 'black' //return colorScale(d.DruhNehody)
          })
          .attr('cx', d => {
            d.forceGPS = viewport.unproject([d.x, d.y])
            d.pos = viewport.project([d.X, d.Y])
            // d.pos = projection([d.X, d.Y])
            d.x = d.pos[0]
            return d.pos[0]
          })
          .attr('cy', d => {
            d.y = d.pos[1]
            return d.pos[1]
          })
      }

      return this.nodes
    },

    computedFirstPartyData: function() {
      const latlon1 = [16.59512715090524, 49.20013082305056]
      //const latlon2 = [16.595096320004444, 49.19380583417316]
      const latlon3 = [16.605566189434686, 49.19358091860195]
      //const latlon4 = [16.605512948005973, 49.19883456531343]
      this.dataD3.accidents.forEach(d => {
        if (
          d.forceGPS[0] > latlon1[0] &&
          d.forceGPS[0] < latlon3[0] &&
          d.forceGPS[1] < latlon1[1] &&
          d.forceGPS[1] > latlon3[1]
        ) {
          d.area = true
          d.party = 1
          //console.log(d)
        } else {
          d.area = false
          d.party = 0
        }
      })

      const firstParty = []

      this.nodes
        .attr('class', d => {
          if (d.area) {
            //console.log(d)
            firstParty.push(d)
            return 'houseParty'
          } else {
            return 'nodes'
          }
        })
        .attr('fill', d => {
          if (d.area) {
            //console.log(d.tooFar)
            return 'green'
          }
          return 'black'
        })

      this.firstParty = firstParty

      return this.firstParty
    },
    computedPartyNodes: function() {},

    computedWidth: function() {
      // return this.$store.state.map.getCanvas().width
      return window.innerWidth
    },

    computedHeight: function() {
      //return this.$store.state.map.getCanvas().height
      return window.innerHeight
    }
  }
}
</script>

<style>
.houseParty {
  visibility: hidden;
}

.nodes {
  stroke: #fff;
  stroke-width: 2px;
}

#test_svg {
  position: relative;
}
</style>
