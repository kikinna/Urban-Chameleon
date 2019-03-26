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
import Vue from 'vue'

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
      //transition: null, //animated transition for all, uhuh, not working as intended
      neighbourhoodNodesInSVG: [],
      dataD3: [], //accident data
      grid_cells: [], // barchart grid positions {x, y, occupied} //TODO: temporary
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
        .attr('id', 'main_svg')
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
          return colorScale(d.DruhNehody) //'black'
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
        //this.points = []
        while (this.points.length > 0) {
          //TODO???
          this.points.pop()
        } //empty the array
        this.anchorPoint = null
      })
    },
    makeNeighbourPolygons() {
      this.recompute = false
      this.reverse = false
      this.anchorPoint = null
      //this.points = []
      //this.neighbour = []
      while (this.neighbour.length > 0) {
        //TODO???
        this.points.pop()
        this.neighbour.pop()
      } //empty the array
      while (this.points.length > 0) {
        this.points.pop()
      } //empty the array
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
    //should work with array of node indexes from convex hull
    // TO DO : Prep of ds + adding necessary attributes + rename, haha
    initAggregatedVisData() {
      //console.log('aggrData bef bef', this.aggregatedData)

      while (this.aggregatedData.length > 0) {
        this.aggregatedData.pop()
      } //empty the array

      //console.log('aggrData bef', this.aggregatedData)
      //neighbour data from convex hull
      for (var i = 0; i < this.neighbour.length; i++) {
        let neighbourhood = {
          nodesInNeighbourhood: [],
          centerInGPS: null,
          centerInPx: null,
          other_stuff: null,
          id: i
        }
        this.neighbour[i].hood.forEach(n => {
          let d = this.dataD3.accidents[n]

          let newNode = {
            id: d.OBJECTID,
            x: d.x,
            y: d.y,
            X: d.X,
            Y: d.Y,
            indexInAccidentData: n,
            fx: null,
            fy: null,
            inNeighbourhood: true,
            neighbourhoodPosition: null,
            DruhNehody: d.DruhNehody,
            neighbourhoodID: 1, //idk
            center: [0, 0]
          }
          if (
            accidentData.accidents[n].hasOwnProperty('neighbourhoodPosition')
          ) {
            newNode.neighbourhoodPosition =
              accidentData.accidents[n].neighbourhoodPosition
          }

          d.isInNeighbourhood = true

          neighbourhood.nodesInNeighbourhood.push(newNode)

          //console.log('am i doin dis right', this.dataD3.accidents[d])
        })
        this.getNeighbourhoodCenter(neighbourhood)
        this.aggregatedData.push(neighbourhood)
      }
      //console.log('aggrData af', this.aggregatedData)
    },
    getNeighbourhoodGPSCenter(neighbourhood) {
      let minX = Infinity
      let minY = Infinity
      let maxX = 0
      let maxY = 0

      neighbourhood.nodesInNeighbourhood.forEach(d => {
        if (d.X < minX) {
          minX = d.X
        }
        if (d.X > maxX) {
          maxX = d.X
        }
        if (d.Y < minY) {
          minY = d.Y
        }
        if (d.Y > maxY) {
          maxY = d.Y
        }
      })

      const shiftX = (minX + maxX) / 2
      const shiftY = (minY + maxY) / 2

      neighbourhood.centerGPS = [shiftX, shiftY]
    },
    getNeighbourhoodCenter(neighbourhood) {
      let viewport = getViewport(this.$store.state.map)
      let minX = Infinity
      let minY = Infinity
      let maxX = 0
      let maxY = 0

      neighbourhood.nodesInNeighbourhood.forEach(d => {
        if (d.X < minX) {
          minX = d.X
        }
        if (d.X > maxX) {
          maxX = d.X
        }
        if (d.Y < minY) {
          minY = d.Y
        }
        if (d.Y > maxY) {
          maxY = d.Y
        }
      })

      const shiftX = (minX + maxX) / 2
      const shiftY = (minY + maxY) / 2

      neighbourhood.centerInGPS = [shiftX, shiftY]
      neighbourhood.centerInPx = viewport.project([shiftX, shiftY])
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
        // d3.selectAll('.neighbourhood').classed('neighbourhood', false)
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

        //this.updateVisualizations()
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
      // this.redrawAggregatedVis() //works... not much fluid when changing the amount of nodes in the neighbourhood
      this.updateAggregatedVis() //problem somewhere... definitely not me, blame it on the observers
      //this.$forceUpdate() //attempt to force vue to update DOM
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
    //initialisation of grid for aggregated visualization (house parties)
    initGrid(arrayLength) {
      const CELL_SIZE = 10
      const GRID_COLS = 5
      const GRID_ROWS = Math.ceil(arrayLength / GRID_COLS)

      const currentCells = []

      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          if (arrayLength <= 0) break
          var cell
          cell = {
            x: c * CELL_SIZE,
            y: GRID_COLS - r * CELL_SIZE,
            occupied: false
          }
          currentCells.push(cell)
          arrayLength--
        }
      }

      this.grid_cells.push(currentCells)
    },
    drawAggregatedVis() {
      this.initAggregatedVisData()

      // Neni to uplne pekne, ze to neporovnavame na neighbourhoodCounts
      while (this.grid_cells.length > 0) {
        this.grid_cells.pop()
        this.neighbourhoodNodesInSVG.pop()
      }

      // animated transition of nodes in aggregated vis
      // Possible shift to mounted? Maybe?
      const t = d3
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)

      d3.selectAll('.circlesInAggregatedVis').remove()

      const viewport = getViewport(this.$store.state.map)
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      let testGdata = this.svg
        .selectAll('g.neighbourhood-g')
        .data(this.aggregatedData)
        .join('g')
        .attr('id', d => {
          return 'neighbourhood-' + d.id
        })
        .attr('class', 'neighbourhood-g')
        .attr('transform', d => {
          return 'translate(' + d.centerInPx[0] + ', ' + d.centerInPx[1] + ')'
        })

      // For testing of neighbourhood group elements
      // testGdata.append('circle')
      //   .attr('r', 20)
      //   .attr('cx', 0)
      //   .attr('cy', 0)
      //   .attr('fill', 'pink')

      // Setup
      for (var i = 0; i < this.aggregatedData.length; i++) {
        // Setup neighbourhood in DOM (g/circles) in their GPS positions
        let currentNeighbourhoodSVGNodes = d3
          .select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .data(this.aggregatedData[i].nodesInNeighbourhood)
          .join('circle')
          .attr('class', 'circlesInAggregatedVis')
          .attr('r', 5)
          .attr('fill', d => {
            return colorScale(d.DruhNehody)
          })
          .attr('cx', d => {
            d.pos = viewport.project([d.X, d.Y])
            d.x = d.pos[0]
            return d.pos[0] - this.aggregatedData[i].centerInPx[0]
          })
          .attr('cy', d => {
            d.y = d.pos[1]
            return d.pos[1] - this.aggregatedData[i].centerInPx[1]
          })

        this.initGrid(this.aggregatedData[i].nodesInNeighbourhood.length)

        // For each neighbourhood nodes find a position in a grid and move it there w/ transition
        currentNeighbourhoodSVGNodes
          .transition(t)
          .each(d => {
            let gridpoint = occupyNearest(d, this.grid_cells[i])
            if (gridpoint) {
              d.x = gridpoint.x
              d.y = gridpoint.y
              accidentData.accidents[
                d.indexInAccidentData
              ].neighbourhoodPosition = [d.x, d.y]
              d.neighbourhoodPosition = [d.x, d.y]
              d.forceGPS = viewport.unproject([d.x, d.y])
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        this.neighbourhoodNodesInSVG.push(currentNeighbourhoodSVGNodes)
      } // end of that huge for cycle

      //making nodes included in aggregated vis invisible in map
      this.nodes.attr('class', d => {
        if (d.isInNeighbourhood) {
          return 'neighbourhood'
        } else {
          return 'nodes'
        }
      })
    },
    //updating aggregated vis. (house parties); called on zoom and move
    updateAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('g.neighbourhood-g').attr('transform', d => {
        //console.log(d)
        let pos = viewport.project(d.centerInGPS)
        return 'translate(' + pos[0] + ', ' + pos[1] + ')'
      })

      // has neighbourhood changed?
      // NO -> update neighbourhood center
      // YES -> neco vic

      const t = d3
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)

      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      // init DS for individual aggregated vis
      this.initAggregatedVisData()

      // empty array of grid cells before reinitializing it in the for loop for each neighbourhood
      while (this.grid_cells.length > 0) {
        this.grid_cells.pop()
      }

      this.svg
        .selectAll('g.neighbourhood-g')
        .data(this.aggregatedData)
        .join('g')
        .attr('id', d => {
          return 'neighbourhood-' + d.id
        })
        .attr('class', 'neighbourhood-g')
        .attr('transform', d => {
          return 'translate(' + d.centerInPx[0] + ', ' + d.centerInPx[1] + ')'
        })

      for (var i = 0; i < this.aggregatedData.length; i++) {
        console.log(
          'len bef',
          i,
          this.aggregatedData[i].nodesInNeighbourhood.length
        )
        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .data(this.aggregatedData[i].nodesInNeighbourhood)
          .join(
            enter =>
              enter
                .append('circle')
                .attr('class', 'circlesInAggregatedVis')
                .attr('r', 5)
                .attr('fill', d => {
                  return colorScale(d.DruhNehody)
                })
                .attr('cx', d => {
                  if (d.neighbourhoodPosition) {
                    //console.log('already in', d)
                    d.x = d.neighbourhoodPosition[0]
                    return d.x
                  } else {
                    //console.log('newbie', d.x, d.pos)
                    d.pos = viewport.project([d.X, d.Y])
                    d.x = d.pos[0]
                    //console.log(d.x, d.pos)
                    return d.pos[0] - this.aggregatedData[i].centerInPx[0]
                  }
                })
                .attr('cy', d => {
                  if (d.neighbourhoodPosition) {
                    d.y = d.neighbourhoodPosition[1]
                    return d.y
                  } else {
                    d.y = d.pos[1]
                    return d.pos[1] - this.aggregatedData[i].centerInPx[1]
                  }
                }),
            update =>
              update
                .attr('cx', d => {
                  if (d.neighbourhoodPosition) {
                    //console.log('already in', d)
                    d.x = d.neighbourhoodPosition[0]
                    return d.x
                  } else {
                    //console.log('newbie')
                    d.pos = viewport.project([d.X, d.Y])
                    d.x = d.pos[0]
                    return d.pos[0] - this.aggregatedData[i].centerInPx[0]
                  }
                })
                .attr('cy', d => {
                  if (d.neighbourhoodPosition) {
                    d.y = d.neighbourhoodPosition[1]
                    return d.y
                  } else {
                    d.y = d.pos[1]
                    return d.pos[1] - this.aggregatedData[i].centerInPx[1]
                  }
                }),
            exit =>
              exit
                .each(d => {
                  d.isInNeighbourhood = false
                  let accidentNode =
                    accidentData.accidents[d.indexInAccidentData]
                  accidentNode.isInNeighbourhood = false
                  console.log('exit', d)
                  console.log(
                    'exit',
                    accidentData.accidents[d.indexInAccidentData]
                  )
                  delete accidentData.accidents[d.indexInAccidentData]
                    .neighbourhoodPosition
                })
                .classed('neighbourhood', false)
                .classed('circlesInAggregatedVis', false)
                .classed('nodes', true)
                .remove()
          )

        this.initGrid(this.aggregatedData[i].nodesInNeighbourhood.length)
        console.log(
          'len af',
          i,
          this.aggregatedData[i].nodesInNeighbourhood.length
        )

        //this.neighbourhoodNodesInSVG[i]
        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .transition(t)
          .each(d => {
            let gridpoint = occupyNearest(d, this.grid_cells[i])
            if (gridpoint) {
              //console.log('d before', d)
              let newX = gridpoint.x // + shift[0]
              let newY = gridpoint.y // + shift[1]

              d.x = gridpoint.x
              d.y = gridpoint.y
              // console.log(d.x, d.y)
              let newForceGPS = viewport.unproject([newX, newY])
              let pos = viewport.project(newForceGPS)
              // Vue.set(d, 'cx', pos[0])
              Vue.set(d, 'cx', pos[0])
              //Vue.set(d, 'cx', pos[0])
              // Vue.set(d, 'cy', pos[1])
              Vue.set(d, 'cy', pos[1])
              d.neighbourhoodPosition = [d.x, d.y]
              //Vue.set(d, 'cy', pos[1])
              //console.log('d after', d)
              //d.setAttribute('cx', pos[0])
              //d.setAttribute('cy', pos[1])
              // this.neighbourhoodNodesInSVG[i].setAttribute('cx', 100)
              //console.log('d are we doion anything', d)
              //console.log('cx', this.neighbourhoodNodesInSVG[i].getAttribute('cx'))
              //this.neighbourhoodNodesInSVG[i].setAttribute('cx', 100)
              //this.neighbourhoodNodesInSVG[i].setAttribute('cy', 100)
              //Vue.set(this.neighbourhoodNodesInSVG[i], 'd.x', d.x)
              //Vue.set(this.neighbourhoodNodesInSVG[i], 'd.y', d.y)
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        //console.log('nodes after', this.neighbourhoodNodesInSVG)
      } //end of the extra big for cycle

      //making nodes included in aggregated vis invisible in map
      this.nodes.attr('class', d => {
        if (d.isInNeighbourhood) {
          return 'neighbourhood'
        } else {
          return 'nodes'
        }
      })
    }
  }, // end of methods
  computed: {
    computedNodes: function() {
      if (this.nodes) {
        const colorScale = d3.scaleOrdinal(d3.schemeDark2)
        const viewport = getViewport(this.$store.state.map)

        this.nodes
          .attr('r', this.nodeRadius)
          .attr('fill', d => {
            if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
              return '#487284d2'
            }
            return colorScale(d.DruhNehody) //'black'
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

#main_svg {
  position: relative;
}

.circlesInAggregatedVis {
  stroke: rgb(255, 255, 255);
  stroke-width: 2px;
}
</style>
