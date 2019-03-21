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
  measureGeoDistance,
  drawPolygon
} from '../helpers/geoProjectionHelper.js'
import { occupyNearest } from '../helpers/mathHelper.js'

export default {
  name: 'Visualization',
  data() {
    return {
      aggregatedData: [],
      aggregatedNodes: null,
      dataD3: [], //accident data
      cells: [], // barchart grid positions //TODO: temporary
      simulation: null, // accident data force simulation
      svg: null,
      nodes: null, //accident nodes
      nodeRadius: 5,
      distanceLimit: 0.000001 //used in calculateDistanceDeviation to compare with the calculated distance between nodes
    }
  },
  store,
  mounted() {
    this.dataD3 = accidentData
    this.render()
    this.listeners()
  },
  methods: {
    //force layout initialisation (svg, nodes, simulation)
    render() {
      const viewport = getViewport(this.$store.state.map)
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

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
        })

      // this.calculateDistanceDeviation()

      this.simulation = d3
        .forceSimulation()
        .nodes(this.dataD3.accidents)
        /* .force('collide',d3.forceCollide().radius(this.nodeRadius * 2).strength(1).iterations(1)) */
        .on('tick', this.tick)
      //.on('end', this.end)
    },
    //force layout update, called on zoom and move
    updateD3() {
      const viewport = getViewport(this.$store.state.map)

      this.nodes
        .attr('cx', function(d) {
          if (d.area) {
            return
          }
          d.x = viewport.project(d.forceGPS)[0]
          return d.x
        })
        .attr('cy', function(d) {
          if (d.area) {
            return
          }
          d.y = viewport.project(d.forceGPS)[1]
          return d.y
        })

      //this.calculateDistanceDeviation()

      this.simulation.alpha(0.1).restart()
    },
    //accident's simulation tick
    tick() {
      // this.calculateDistanceDeviation()
      const viewport = getViewport(this.$store.state.map)

      this.nodes
        .attr('cx', function(d) {
          if (d.area) {
            return
          }
          d.forceGPS = viewport.unproject([d.x, d.y])
          return d.x
        })
        .attr('cy', function(d) {
          if (d.area) {
            return
          }
          return d.y
        })
    },
    //accident's simulation end
    end() {
      this.calculateDistanceDeviation()
    },
    //initialisation of grid for aggregated visualization (house parties)
    initGrid(arrayLength) {
      const CELL_SIZE = 10
      const GRID_COLS = 6
      const GRID_ROWS = Math.ceil(arrayLength / GRID_COLS)

      const cells = []

      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          if (arrayLength <= 0) break
          var cell
          cell = {
            x: c * CELL_SIZE,
            y: GRID_COLS - r * CELL_SIZE,
            occupied: false
          }
          cells.push(cell)
          arrayLength--
        }
      }

      this.cells = cells
    },
    //updating aggregated vis. (house parties); called on zoom and move
    //updatePartyNodes() { // in memoriam of party names
    updateAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      const latlon1 = [16.59512715090524, 49.20013082305056]
      const latlon3 = [16.605566189434686, 49.19358091860195]

      const shiftX = (latlon1[0] + latlon3[0]) / 2
      const shiftY = (latlon1[1] + latlon3[1]) / 2

      const shift = viewport.project([shiftX, shiftY])

      //console.log(viewport)

      this.aggregatedNodes
        .each(d => {
          let gridpoint = occupyNearest(d, this.cells) //TODO: this.cells should change
          if (gridpoint) {
            // ensures smooth movement towards final positoin
            //d.x += (gridpoint.x - d.x) * 0.05
            //d.y += (gridpoint.y - d.y) * 0.05

            // jumps directly into final position
            d.fx = gridpoint.x + shift[0]
            d.fy = gridpoint.y + shift[1]
          }
        })
        .attr('cx', d => {
          d.forceGPS = viewport.unproject([d.fx, d.fy])
          d.pos = viewport.project(d.forceGPS)
          //d.fx = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          //d.fy = d.pos[1]
          return d.pos[1]
        })
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
    //should work with array of node indexes from convex hull; right now hardcoded neighbourhood
    // TO DO : Prep of ds + adding necessary attributes + rename, haha
    initNeighbourData() {
      const latlon1 = [16.59512715090524, 49.20013082305056]
      const latlon3 = [16.605566189434686, 49.19358091860195]

      //let nodesInNeighbourhood = []

      this.dataD3.accidents.forEach(d => {
        if (
          //TODO: should be d.x,y
          d.forceGPS[0] > latlon1[0] &&
          d.forceGPS[0] < latlon3[0] &&
          d.forceGPS[1] < latlon1[1] &&
          d.forceGPS[1] > latlon3[1]
        ) {
          d.area = true
          let currentNode = {
            id: d.OBJECTID,
            x: d.x,
            y: d.y,
            X: d.X,
            Y: d.Y,
            neighbourhoodID: 1, //idk
            center: [
              (latlon1[0] + latlon3[0]) / 2,
              (latlon1[1] + latlon3[1]) / 2
            ]
          }
          //nodesInNeighbourhood.push(currentNode)
          this.aggregatedData.push(currentNode)
        } else {
          d.area = false
        }
      })

      this.nodes
        .attr('class', d => {
          if (d.area) {
            return 'neighbourhood'
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

      //this.aggregatedData.push(nodesInNeighbourhood)
    },
    initAggregatedVis() {
      this.initNeighbourData()
      this.initGrid(this.aggregatedData.length)
      this.drawSingleAggregatedVis()
      this.updateAggregatedVis()
    },
    overallUpdate() {
      this.updateD3()
      drawPolygon(this.svg, this.$store.state.map) //will be replaced by convex hull
      this.initGrid(this.aggregatedData.length)
      this.drawSingleAggregatedVis()
      this.updateAggregatedVis()
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.overallUpdate()
      })
      this.$root.$on('map-move', () => {
        this.overallUpdate()
      })

      this.$root.$on('map-click', () => {
        this.initAggregatedVis()
        this.overallUpdate()
      })
    },
    // TO DO: comment
    // "draw/setup single aggregated vis"
    drawSingleAggregatedVis() {
      //this.computeFirstPartyData()
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('.partyCircles').remove()

      this.aggregatedNodes = this.svg
        .append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(this.aggregatedData)
        .join('circle')
        .attr('class', 'partyCircles')
        .attr('r', 5)
        .attr('fill', 'blue')
        .attr('cx', d => {
          //if (d.fx != null && d.fy != null) {
          d.forceGPS = viewport.unproject([d.fx, d.fy])
          /* } else {
            d.forceGPS = viewport.unproject([d.x, d.y])
          } */
          d.pos = viewport.project(d.forceGPS)
          d.fx = d.pos[0]
          //console.log(d.fy)
          return d.pos[0]
        })
        .attr('cy', d => {
          d.fy = d.pos[1]
          return d.pos[1]
        })
    }
  }, // end of methods
  computed: {
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
    }
  }
}
</script>

<style>
.neighbourhood {
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
