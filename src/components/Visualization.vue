<template>
  <div
    style="background-color:white; position:relative; visibility: hidden;"
    @click.left="calculateDistanceDeviation"
    @click.right.prevent="simulation.restart"
  ></div>
</template>

<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/nehody2018.js'
import {
  getViewport,
  measureGeoDistance
} from '../helpers/geoProjectionHelper.js'
import { occupyNearest } from '../helpers/mathHelper.js'

export default {
  name: 'Visualization',
  data() {
    return {
      dataD3: [], //accident data
      cells: [], // barchart grid positions //TODO: temporary
      firstParty: [], // accident data for first barchart // tmp
      partyNodes: null, // nodes for first barchart // tmp
      partySimulation: null, // barchart force simulation // tmp
      simulation: null, // accident data force simulation
      svg: null,
      nodes: null, //accident nodes
      nodeRadius: 5,
      forceProperties: {
        collide: {
          enabled: true,
          strength: 1,
          iterations: 1,
          radius: 10
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
      distanceLimit: 0.000001 //used in calculateDistanceDeviation to compare with the calculated distance between nodes 
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
      /* Object.defineProperty(this.dataObject, 'nested', {configurable: false}) */
      /* Object.defineProperty(this.dataObject.actualData, 'nested', {configurable: false}) */
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
    //force layout initialisation (svg, nodes, simulation)
    render() {
      const viewport = getViewport(this.$store.state.map)
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)
      //let drag = d3.drag().on('start', this.dragStarted).on('drag', this.dragged).on('end', this.dragEnded)

      this.svg = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('svg')
        .attr('id', 'test_svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

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
          d.x = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
        })
        .on('click', d => {
          /* console.log( 'deviation', d.deviation, ' but is it too far? ', d.tooFar ) */
          // this.calculateDistanceDeviation()
        }) //.call(drag)

      // this.calculateDistanceDeviation()

      this.simulation = d3
        .forceSimulation()
        .nodes(this.dataD3.accidents)
        /* .force(
          'collide',
          d3
            .forceCollide()
            .radius(this.nodeRadius * 2)
            .strength(this.forceProperties.collide.enabled * this.forceProperties.collide.strength)
            .iterations(this.forceProperties.collide.iterations)
        ) */
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = viewport.project([d.X, d.Y])
              return d.pos[0]
            })
            .strength(this.forceProperties.forceX.enabled * this.forceProperties.forceX.strength)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(this.forceProperties.forceY.enabled * this.forceProperties.forceY.strength)
        )
        .on('tick', this.tick)
      //.on('end', this.end)
    },
    //force layout update, called on zoom and move
    updateD3() {
      const viewport = getViewport(this.$store.state.map)

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
    //accident's simulation tick
    tick() {
      // this.calculateDistanceDeviation()
      const viewport = getViewport(this.$store.state.map)

      this.nodes
        .attr('cx', function(d) {
          d.forceGPS = viewport.unproject([d.x, d.y])
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        })
    },
    //accident's simulation end
    end() {
      this.calculateDistanceDeviation()
      console.log('simulation end')
    },
    //initialisation of grid for aggregated visualization (house parties)
    initGrid(arrayLength) {
      const GRID_SIZE = 10
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
    //so aptly named that it speaks for itself
    //jk, this initializes the aggregated vis. (house parties)
    //right now I hardcoded two latlon coordinates for one square
    //those will be changed when Megi actually does something for once :o
    housePartyAreas() {
      const latlon1 = [16.59512715090524, 49.20013082305056] //const latlon2 = [16.595096320004444, 49.19380583417316]
      const latlon3 = [16.605566189434686, 49.19358091860195] //const latlon4 = [16.605512948005973, 49.19883456531343]

      this.firstParty = this.computedFirstPartyData

      const viewport = getViewport(this.$store.state.map)

      this.initPartyForceSimulation(latlon1, latlon3)
    },
    //updating aggregated vis. (house parties); called on zoom and move
    updatePartyNodes(shiftX, shiftY) {
      const viewport = getViewport(this.$store.state.map)
      const shift = viewport.project([shiftX, shiftY])

      this.partyNodes
        .each(d => {
          let gridpoint = occupyNearest(d, this.cells)
          if (gridpoint) {
            // ensures smooth movement towards final positoin
             //d.x += (gridpoint.x - d.x) * 0.05
             //d.y += (gridpoint.y - d.y) * 0.05

            // jumps directly into final position
            d.x = gridpoint.x + shift[0]
            d.y = gridpoint.y + shift[1]
          }
        })
        .attr('cx', d => {
          d.forceGPS = viewport.unproject([d.x, d.y])
          d.pos = viewport.project(d.forceGPS)
          d.x = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
        })
    },
    //initializes aggregated vis.'s simulation (house parties), also contains tick function
    initPartyForceSimulation(latlon1, latlon3) {
      this.partySimulation = d3
        .forceSimulation(this.computedFirstPartyData)
        .force(
          'center',
          d3.forceCenter(
            window.innerWidth / 2,
            window.innerHeight / 2
            /* (latlon1[0] + latlon3[0]) / 2, (latlon1[1] + latlon3[1]) / 2 */
          )
        )

      const shiftX = (latlon1[0] + latlon3[0]) / 2
      const shiftY = (latlon1[1] + latlon3[1]) / 2

      this.computedPartyNodes

      this.partySimulation.alpha(0.1).restart()

      this.partySimulation.on('tick', () => {
        this.initGrid(this.computedFirstPartyData.length)

        this.updatePartyNodes(shiftX, shiftY)

        this.partySimulation.alpha(0.1) //TODO: is this needed?
      })
      .on('end', console.log('party ended'))
    },
    //calculates distance for all accidents, between the point A (where they are right now)
    //and point B (where they were supposed to be according to their geo data)
    //if the difference is larger than distanceLimit, it sets "tooFar" flag
    calculateDistanceDeviation() {
      const viewport = getViewport(this.$store.state.map)
      this.dataD3.accidents.forEach(d => {
        const unshiftedCoords = [d.X, d.Y]
        const currentCoords = viewport.unproject(d.pos)

        const distanceInMeters = measureGeoDistance(
          unshiftedCoords[0],
          unshiftedCoords[1],
          currentCoords[0],
          currentCoords[1]
        )
        d.deviation = distanceInMeters
        d.tooFar = distanceInMeters > this.distanceLimit
      })

      this.nodes.attr('fill', d => {
        if (d.tooFar) {
          return 'red'
        }
        return 'black'
      })
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.updateD3()

        const latlon1 = [16.59512715090524, 49.20013082305056]
        const latlon3 = [16.605566189434686, 49.19358091860195]

        const shiftX = (latlon1[0] + latlon3[0]) / 2
        const shiftY = (latlon1[1] + latlon3[1]) / 2
        this.updatePartyNodes(shiftX, shiftY)
      })
      this.$root.$on('map-move', () => {
        this.updateD3()
        const latlon1 = [16.59512715090524, 49.20013082305056]
        const latlon3 = [16.605566189434686, 49.19358091860195]

        const shiftX = (latlon1[0] + latlon3[0]) / 2
        const shiftY = (latlon1[1] + latlon3[1]) / 2
        this.updatePartyNodes(shiftX, shiftY)
      })
      //just end events
      // this.$root.$on('map-zoomend', () => {}) // this.$root.$on('map-moveend', () => {})
      // this.$root.$on('map-movestart', () => {}) // this.$root.$on('map-zoomstart', () => {})
      // this.$root.$on('map-zoomend', () => {})
      this.$root.$on('map-click', () => {
        this.housePartyAreas()
      })
    }
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
  computed: {
    computedForceLayout: function() {
      if (this.simulation) {
        const viewport = getViewport(this.$store.state.map)

        this.simulation
          .force(
            'forceX',
            d3
              .forceX(d => {
                d.pos = viewport.project([d.X, d.Y])
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
          .attr('width', window.innerWidth)
          .attr('height', window.innerHeight)
      }

      return this.svg
    },

    computedNodes: function() {
      if (this.nodes) {
        //const colorScale = d3.scaleOrdinal(d3.schemeDark2)
        const viewport = getViewport(this.$store.state.map)

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
      const latlon1 = [16.59512715090524, 49.20013082305056] //const latlon2 = [16.595096320004444, 49.19380583417316]
      const latlon3 = [16.605566189434686, 49.19358091860195] //const latlon4 = [16.605512948005973, 49.19883456531343]
      this.dataD3.accidents.forEach(d => {
        if (
          d.forceGPS[0] > latlon1[0] &&
          d.forceGPS[0] < latlon3[0] &&
          d.forceGPS[1] < latlon1[1] &&
          d.forceGPS[1] > latlon3[1]
        ) {
          d.area = true
          d.party = 1
        } else {
          d.area = false
          d.party = 0
        }
      })

      const firstParty = []

      this.nodes
        .attr('class', d => {
          if (d.area) {
            firstParty.push(d)
            return 'houseParty'
          } else {
            return 'nodes'
          }
        })
        .attr('fill', d => {
          if (d.area) {
            return 'green'
          }
          return 'black'
        })

      this.firstParty = firstParty

      return this.firstParty
    },
    computedPartyNodes: function() {
      const viewport = getViewport(this.$store.state.map)

      const partyNodes = this.svg
        .append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(this.computedFirstPartyData)
        .join('circle')
        .attr('class', 'partyCircles')
        .attr('r', 5)
        .attr('fill', 'blue')
        .attr('cx', d => {
          d.forceGPS = viewport.unproject([d.x, d.y])
          d.pos = viewport.project(d.forceGPS)
          d.x = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
        })

      this.partyNodes = partyNodes

      return this.partyNodes
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
