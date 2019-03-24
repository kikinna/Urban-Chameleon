<template>
  <div>
    <svg></svg>
    <AccidentDetail
      v-for="(curr_accident, index) in detailAccidents"
      :key="index"
      :accident="allData[curr_accident]"
      :index="index"
    ></AccidentDetail>
  </div>
</template>

<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/nehody2018.js'
import AccidentDetail from './AccidentDetail.vue'
import {
  sortPoints,
  checkPoints,
  addPoint,
  getAngle
} from '../helpers/neighbourhoodCountingHelper.js'

import {
  getViewport,
  measureGeoDistance
} from '../helpers/geoProjectionHelper.js'
import { occupyNearest } from '../helpers/mathHelper.js'

export default {
  name: 'Visualization',
  components: {
    AccidentDetail
  },
  data() {
    return {
      detailAccidents: [], //indices for detail card of accident
      allData: [],
      points: [], //indices of points for countinginprogress neighbourhood
      neighbour: [], //Array of neighbourhoods objects - hull:indices of convex hull points, hood:indices of all points, anchorpoint
      startingPoints: [], //points for visualization of neighbourhoods - just prototype
      compute: 0,
      anchorPoint: null, //anchor point of counting in progress neighbourhood
      reverse: false, //helper for angles in convexhull counting
      title: null,
      aggregatedData: [],
      aggregatedNodes: [],
      dataD3: [], //accident data
      cells: [], // barchart grid positions //TODO: temporary
      simulation: null, // accident data force simulation
      svg: null,
      nodes: null, //accident nodes
      polygons: null,
      nodeRadius: 5,
      recompute: false, //variable for recomputing neighbourhoods after moved map
      distanceLimit: 0.000001 //used in calculateDistanceDeviation to compare with the calculated distance between nodes
    }
  },
  store,
  mounted() {
    //this.loadData()
    this.dataD3 = accidentData
    this.render()
    this.listeners()

    //preseting attributes of accidents for easier manipulation
    this.allData = accidentData.accidents
    //let count = 0
    for (var i = 0; i < accidentData.accidents.length; i++) {
      accidentData.accidents[i].theNeighbourhood = null
      accidentData.accidents[i].index = i
    }
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

      const t = d3
        .transition()
        .duration(750)
        .ease(d3.easeLinear)

      this.polygons = this.svg.append('g')

      // this.calculateDistanceDeviation()

      this.nodes = this.svg
        .append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(this.dataD3.accidents)
        .enter()
        .append('circle')
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
            return '#487284d2'
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

      this.simulation = d3
        .forceSimulation()
        //.polygons(this.neighbour)
        .nodes(this.dataD3.accidents)
        /* .force('collide',d3.forceCollide().radius(this.nodeRadius * 2).strength(1).iterations(1)) */
        //.polygons(this.neighbour)
        .on('tick', this.tick)
        .on('end', this.end)
    },
    //force layout update, called on zoom and move
    updateD3() {
      const viewport = getViewport(this.$store.state.map)

      this.nodes
        .attr('cx', function(d) {
          /* if (d.area) {
            return
          } */
          d.x = viewport.project(d.forceGPS)[0]
          return d.x
        })
        .attr('cy', function(d) {
          /* if (d.area) {
            return
          } */
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

      /* const t = d3
        .transition()
        //.duration(0)
        .ease(d3.easeLinear) */

      this.nodes
        //.transition(t)
        //d3.selectAll('.nodes')
        .attr('cx', function(d) {
          /* if (d.area) {
            return
          } */
          d.forceGPS = viewport.unproject([d.x, d.y])
          return d.x
        })
        .attr('cy', function(d) {
          /* if (d.area) {
            return
          } */
          return d.y
        })

      //console.log(this.simulation.alpha(), this.recompute);
      if (this.recompute) {
        this.makeNeighbourPolygons()
      }
    },
    computeNeighbourhoods() {
      this.startingPoints.forEach(o => {
        //mark all points which belonge to neighbouhood (attribute theNeighbourhood) and add to point array
        this.getNeighbours(accidentData.accidents[o])
        if (this.points.length > 1) {
          //neighbourhood of one point is not neighbouhood
          let hull = this.getHull(this.anchorPoint)
          //add neighbourhood object to array of neighbouhoods
          let neigh = {
            hull: hull, //convexhull points
            hood: [...this.points], //all neighbourhood points
            anchorPoint: this.anchorPoint
          }
          this.neighbour.push(neigh)
        }
        this.points = []
        this.anchorPoint = null
      })
    },
    makeNeighbourPolygons() {
      this.recompute = false
      this.reverse = false
      this.anchorPoint = null
      this.points = []
      this.neighbour = []
      this.computeNeighbourhoods()
      this.drawPolygon()
    },
    //create polygon from convex hull array
    drawPolygon() {
      d3.selectAll('polygon').remove()
      //this.polygons =
      this.polygons
        .selectAll('polygon')
        .data(this.neighbour)
        .attr('class', 'polygons')
        .enter()
        .append('polygon')
        .attr('points', function(d) {
          let str = ''
          d.hull.forEach(o => {
            str +=
              accidentData.accidents[o].x.toString(10) +
              ',' +
              accidentData.accidents[o].y.toString(10) +
              ' '
          })
          return str
        })
        .style('fill', '#60bac668')
        .style('stroke', '567985cc')
        .style('strokeWidth', '2px')
    },
    //accident's simulation end
    end() {
      this.calculateDistanceDeviation()
    },
    //initialisation of grid for aggregated visualization (house parties)
    initGrid(arrayLength, shift) {
      const CELL_SIZE = 10
      const GRID_COLS = 6
      const GRID_ROWS = Math.ceil(arrayLength / GRID_COLS)

      const currentCells = []

      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          if (arrayLength <= 0) break
          var cell
          cell = {
            x: shift[0] - c * CELL_SIZE,
            y: GRID_COLS + shift[1] - r * CELL_SIZE,
            occupied: false
          }
          currentCells.push(cell)
          arrayLength--
        }
      }

      this.cells.push(currentCells)
    },
    //updating aggregated vis. (house parties); called on zoom and move
    updateAggregatedVis() {
      //d3.selectAll('polygon').remove()
      //this.drawPolygon() //thanks to this, polygon is moving with points

      const viewport = getViewport(this.$store.state.map)
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      this.initNeighbourData()

      //TODO: tmp calculation of center
      let minX = 0
      let minY = 0
      let maxX = 0
      let maxY = 0

      for (var i = 0; i < this.aggregatedData.length; i++) {
        ////////////////////////////////////////////////////////
        //
        //
        // tmp calc of center

        this.aggregatedData[i].forEach(d => {
          //console.log('d', d)
          if (d.X > minX) {
            minX = d.X
          }
          if (d.X > maxX) {
            maxX = d.X
          }
          if (d.Y > minY) {
            minY = d.Y
          }
          if (d.Y > maxY) {
            maxY = d.Y
          }
        })

        //const shiftX = (minX + maxX) / 2
        //const shiftY = (minY + maxY) / 2

        const shift = viewport.project([maxX, maxY])

        //const shift = viewport.project([shiftX, shiftY])

        this.initGrid(this.aggregatedData[i].length, shift)

        //
        //
        //
        ///////////////////////

        console.log('--are we gooood?', this.aggregatedNodes[1])

        this.aggregatedNodes[i]
          .each(d => {
            let gridpoint = occupyNearest(d, this.cells[i])
            console.log('still gooood?', d)
            if (gridpoint) {
              d.x = gridpoint.x + shift[0]
              d.y = gridpoint.y + shift[1]
              d.forceGPS = viewport.unproject([d.x, d.y])
              let pos = viewport.project(d.forceGPS)
              d.x = pos[0]
              d.y = pos[1]
              Vue.set(this.aggregatedNodes[i], 'd.x', d.x)
              Vue.set(this.aggregatedNodes[i], 'd.y', d.y)
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
          .attr('fill', d => {
            return colorScale(d.DruhNehody)
          })

        console.log('--still gooood?', this.aggregatedNodes[1])
      }
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
        //console.log(distanceInMeters)
        d.tooFar = distanceInMeters > 0.000001 // currentDistance > 0.000000001 //this.distanceLimit
      })

      this.nodes.attr('fill', d => {
        if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
          return '#487284d2'
        }
        return 'black'
      })
    },
    //should work with array of node indexes from convex hull; right now hardcoded neighbourhood
    // TO DO : Prep of ds + adding necessary attributes + rename, haha
    initNeighbourData() {
      const latlon1 = [16.59512715090524, 49.20013082305056]
      const latlon3 = [16.605566189434686, 49.19358091860195]

      let nodesInNeighbourhood = []
      this.aggregatedData = []

      //neighbour data from convex hull
      for (var i = 0; i < this.neighbour.length; i++) {
        nodesInNeighbourhood = []
        this.neighbour[i].hood.forEach(n => {
          let d = this.dataD3.accidents[n]

          let newNode = {
            id: d.OBJECTID,
            x: d.x,
            y: d.y,
            X: d.X,
            Y: d.Y,
            fx: null,
            fy: null,
            DruhNehody: d.DruhNehody,
            neighbourhoodID: 1, //idk
            center: [
              (latlon1[0] + latlon3[0]) / 2,
              (latlon1[1] + latlon3[1]) / 2
            ]
          }

          nodesInNeighbourhood.push(newNode)
          //console.log('am i doin dis right', this.dataD3.accidents[d])
        })
        this.aggregatedData.push(nodesInNeighbourhood)
      }
    },
    getNeighbours(obj) {
      let posiP2 = []
      this.addPoint(obj.index)
      let r = 22 //TODO zistit ako dostat presne cisla a ako to menit podla zoomu

      //looking through all points in data if its in close neighbourhood, if yes counting close neighbourhood also for them...
      accidentData.accidents.forEach(o => {
        if (o.theNeighbourhood == null && o != obj) {
          let inNeighbour = Math.sqrt(
            Math.pow(obj.x - o.x, 2) + Math.pow(obj.y - o.y, 2)
          )
          if (inNeighbour <= r) {
            o.theNeighbourhood = obj.theNeighbourhood
            this.getNeighbours(o)
          }
        }
      })
      this.colorNeighbourPoints()
    },
    colorNeighbourPoints() {
      this.nodes.attr('fill', d => {
        if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
          return '#487284d2'
        }
        return 'black'
      })
    },
    addPoint(index) {
      let point = accidentData.accidents[index]
      let anchorP = accidentData.accidents[this.anchorPoint]
      //check if this point will be new anchor point
      if (
        this.anchorPoint === null ||
        point.Y < anchorP.Y ||
        (point.Y === anchorP.Y && anchorP.X > point.X)
      ) {
        if (this.anchorPoint !== null) {
          this.points.push(this.anchorPoint)
        }
        this.anchorPoint = index
      } else {
        this.points.push(index)
      }
    },

    findPolarAngle(anchor, p) {
      let deltaX = null
      let deltaY = null

      let point = accidentData.accidents[p]
      let anchorP = accidentData.accidents[anchor]
      deltaX = point.X - anchorP.X
      deltaY = point.Y - anchorP.Y

      if (deltaX == 0 && deltaY == 0) {
        return 0
      }
      return getAngle(deltaX, deltaY, this)
    },

    getHull() {
      let hullPoints = []
      let pointis = []
      let pointsLength = null
      pointis = [...sortPoints(this.anchorPoint, this.points, this)]
      pointsLength = pointis.length
      //if there is less than 3 points, joining these is correct hull
      if (pointsLength < 3) {
        pointis.unshift(this.anchorPoint)
        return points
      }
      //move first two points to output
      hullPoints.push(pointis.shift(), pointis.shift())
      //this looks like a really bad loop, but acctually it is repeated until no concave points are present
      while (true) {
        let p0 = null
        let p1 = null
        let p2 = null
        hullPoints.push(pointis.shift())
        p0 = hullPoints[hullPoints.length - 3]
        p1 = hullPoints[hullPoints.length - 2]
        p2 = hullPoints[hullPoints.length - 1]
        if (checkPoints(p0, p1, p2, this)) {
          hullPoints.splice(hullPoints.length - 2, 1)
        }
        if (pointis.length == 0) {
          if (pointsLength == hullPoints.length) {
            //check for duplicate anchorPoint edge-case, if not found, add the anchorpoint as the first item.
            let ap = this.anchorPoint
            //remove any udefined elements in the hullPoints array.
            hullPoints = hullPoints.filter(function(p) {
              return !!p
            })
            if (
              !hullPoints.some(function(p) {
                return (
                  accidentData.accidents[p].X == accidentData.accidents[ap].X &&
                  accidentData.accidents[p].Y == accidentData.accidents[ap].Y
                )
              })
            ) {
              hullPoints.unshift(this.anchorPoint)
            }
            return hullPoints
          }
          pointis = hullPoints
          pointsLength = pointis.length
          hullPoints = []
          hullPoints.push(pointis.shift(), pointis.shift())
        }
      }
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.updateVisualizations()
        //d3.selectAll('polygon').remove()
      })
      this.$root.$on('map-move', () => {
        this.updateVisualizations()
      })
      //just end events
      this.$root.$on('map-zoomend', () => {
        this.calculateDistanceDeviation()
        //d3.selectAll('polygon').remove()
        this.removeNeighbours()
        this.createNeighbours()
      })
      this.$root.$on('map-moveend', () => {
        this.calculateDistanceDeviation()

        //when zoom is big enough (https://www.youtube.com/watch?v=CCVdQ8xXBfk) , cards about accident detail are shown
        if (this.$store.state.map.getZoom() > 17.8) {
          this.createAccidentDetail()
        }
        /* this.nodes
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
          }) */
      })
      this.$root.$on('map-click', () => {
        this.drawAggregatedVis()
      })
    },
    updateVisualizations() {
      this.updateD3()
      this.drawPolygon()
      this.updateAggregatedVis()
    },
    //Prepareing things for new neighbourhood computing
    removeNeighbours() {
      accidentData.accidents.forEach(o => {
        o.theNeighbourhood = null
      })
      this.startingPoints = []
    },

    //Method for hardpushing points to visualise 2 neighbourhood polygons
    createNeighbours() {
      this.startingPoints.push(1199)
      this.startingPoints.push(478)
      accidentData.accidents[1199].theNeighbourhood =
        accidentData.accidents[1199].OBJECTID
      accidentData.accidents[478].theNeighbourhood =
        accidentData.accidents[478].OBJECTID
      this.recompute = true
    },

    //when proper zoom, find indicies of accidents which detail should be visualised
    createAccidentDetail() {
      this.detailAccidents = []
      accidentData.accidents.forEach(o => {
        let posi = [o.x, o.y]
        if (
          posi[0] > 0 &&
          posi[0] < window.innerWidth &&
          posi[1] > 0 &&
          posi[1] < window.innerHeight
        ) {
          this.detailAccidents.push(o.index)
        }
      })
    },
    drawAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)
      //TODO: tmp calculation of center
      let minX = 0
      let minY = 0
      let maxX = 0
      let maxY = 0

      //
      //
      //

      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      this.initNeighbourData()
      this.aggregatedNodes = []
      this.cells = []

      /* this.nodes.attr('class', d => { //making them invisible
        if (d.area) {
          return 'neighbourhood'
        } else {
          return 'nodes'
        }
      }) */

      const t = d3
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)

      d3.selectAll('.partyCircles').remove()

      for (var i = 0; i < this.aggregatedData.length; i++) {
        let currentAggregatedNodes = this.svg
          .append('g')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .selectAll('circle')
          .data(this.aggregatedData[i])
          .join('circle')
          .attr('class', 'partyCircles')
          .attr('r', 5)
          .attr('fill', d => {
            return colorScale(d.DruhNehody)
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

        ////////////////////////////////////////////////////////
        //
        //
        // tmp calc of center

        this.aggregatedData[i].forEach(d => {
          if (d.X > minX) {
            minX = d.X
          }
          if (d.X > maxX) {
            maxX = d.X
          }
          if (d.Y > minY) {
            minY = d.Y
          }
          if (d.Y > maxY) {
            maxY = d.Y
          }
        })

        const shiftX = (minX + maxX) / 2
        const shiftY = minY //(minY + maxY) / 2

        // const shift = viewport.project([shiftX, shiftY])

        // console.log('shift', shift)

        const shift = viewport.project([maxX, maxY])

        this.initGrid(this.aggregatedData[i].length, shift)

        //
        //
        //
        ///////////////////////

        currentAggregatedNodes
          .transition(t)
          .each(d => {
            let gridpoint = occupyNearest(d, this.cells[i])
            if (gridpoint) {
              d.x = gridpoint.x //+ shift[0]
              d.y = gridpoint.y //+ shift[1]
              d.forceGPS = viewport.unproject([d.x, d.y])
              let pos = viewport.project(d.forceGPS)
              d.x = pos[0]
              d.y = pos[1]
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        this.aggregatedNodes.push(currentAggregatedNodes)
      } // end of that huge for cycle

      //console.log('cells', this.cells[0])
      console.log('this.aggregatedNodes', this.aggregatedNodes)
      console.log('this.aggregatedData', this.aggregatedData)
      console.log('this.cells', this.cells)
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
            if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
              return '#487284d2'
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

.polygons {
  fill: #60bac668;
  stroke: #567985cc;
  stroke-width: 2px;
}

.nodes {
  stroke: rgb(255, 255, 255);
  stroke-width: 2px;
}

#test_svg {
  position: relative;
}
</style>
