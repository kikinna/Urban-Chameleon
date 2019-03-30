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
import accidentData from '../data/accidents2018.js'
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
      neighbourhood: [], //Array of neighbourhoods objects - hullPoints:indices of convex hull points, points:indices of all points, anchorpoint
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
      tooltip: null,
      tree: [],
      nodeRadius: 5,
      isAggrVisActive: false,
      recompute: false, //variable for recomputing neighbourhoods after moved map
      distanceLimit: 0.000001 //used in calculateDistanceDeviation to compare with the calculated distance between nodes
    }
  },
  store,
  mounted() {
    //this.loadData()
    this.$store.state.map.getCanvasContainer().style.cursor = 'default'
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
    this.createNeighbours()
    
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
        .append('g')
        .attr('class', 'tooltip')
        .attr('transform', 'translate(20, 20)')

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
        .each(d => {
          d.isInNeighbourhood = false
        })
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
            return '#487284d2'
          }
          return colorScale(d.Type) //'black'
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

      this.tooltip = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)

      // this.simulation = d3
      //   .forceSimulation()
      //   //.polygons(this.neighbour)
      //   .nodes(this.dataD3.accidents)
      //   /* .force('collide',d3.forceCollide().radius(this.nodeRadius * 2).strength(1).iterations(1)) */
      //   //.polygons(this.neighbour)
      //   .on('tick', this.tick)
      //   .on('end', this.end)
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        // this.updateD3()
        // d3.selectAll('polygon').remove()
        this.moveVisualizations()
        this.updateVisualizations()
        
      })
      this.$root.$on('map-move', () => {
        this.moveVisualizations()
        this.updateVisualizations()
      })
      //just end events
      this.$root.$on('map-zoomend', () => {
        this.calculateDistanceDeviation()
        this.removeNeighbours() 
        this.createNeighbours() //compute new neighbourhoods, make and draw polygons
        this.updateVisualizations()
      })
      this.$root.$on('map-moveend', () => {
        this.calculateDistanceDeviation()
        //when zoom is big enough (https://www.youtube.com/watch?v=CCVdQ8xXBfk) , cards about accident detail are shown
        if (this.$store.state.map.getZoom() > 18.5) {
          this.createAccidentDetail()
        }

        /* this.calculateDistanceDeviation()
        this.removeNeighbours()
        this.createNeighbours()

        this.updateVisualizations() */
      })
      this.$root.$on('map-click', () => {
        this.drawAggregatedVis()
      })
    },
    moveVisualizations() {
      this.updateD3()
      this.drawPolygon()
    },
    //updates positions of circles on map (regular accident data dots), called on zoom and move
    updateD3() {
      const viewport = getViewport(this.$store.state.map)

      this.nodes
        .attr('cx', d => {
          d.forceGPS = viewport.unproject([d.x, d.y]) //probably not needed
          d.pos = viewport.project([d.X, d.Y])
          d.x = d.pos[0]
          d.y = d.pos[1]
          return d.x
        })
        .attr('cy', d => {
          return d.y
        })
        .on('click', d => {
          this.tooltip
            .style('opacity', 1.0)
            .html(d.Type)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          //this.tooltip.hide)
          this.tooltip.style('opacity', 0)
        })
    },
    updateVisualizations() {
      this.updateD3()
      //this.drawPolygon()
      //this.updateAggregatedVis()
      if (!this.isAggrVisActive) {
        this.drawAggregatedVis()
        this.isAggrVisActive = true
      } else {
        this.updateAggregatedVis()
      }
      //TODO: remove visualisations and set this.isAggrVisActive to false on some zoom level

      //making nodes included in aggregated vis invisible in map
      this.nodes.attr('class', d => {
        if (d.isInNeighbourhood) {
          return 'neighbourhood'
        }
        return 'nodes'
      })

      // animated transition of nodes in aggregated vis
      // Possible shift to mounted? Maybe?
      /* const t = d3
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)

      const viewport = getViewport(this.$store.state.map)

      this.nodes
        .attr('cx', d => {
          d.forceGPS = viewport.unproject([d.x, d.y])
          return d.x
        })
        .attr('cy', d => d.y)

      this.nodes

        .transition(t)
        .attr('cx', function(d) {
          d.x = viewport.project(d.forceGPS)[0]
          return d.x
        })
        .attr('cy', function(d) {
          d.y = viewport.project(d.forceGPS)[1]
          return d.y
        }) */
    },
    //prepareing things for new neighbourhoods calculating
     makeNeighbourPolygons() {
      this.recompute = false
      this.reverse = false
      this.anchorPoint = null
      //this.points = []
      //this.neighbour = []
      while (this.neighbourhood.length > 0) {
        //TODO???
        this.points.pop()
        this.neighbourhood.pop()
      } //empty the array
      while (this.points.length > 0) {
        this.points.pop()
      } //empty the array
      this.computeNeighbourhoods()
      this.drawPolygon()
    },
    //calculating neighbourhoods (right now from inserted 2 points, but it should start from one of points where houseparty has begun)
    computeNeighbourhoods() {
      this.startingPoints.forEach(o => {
        //mark all points which belonge to neighbouhood (attribute theNeighbourhood) and add to point array
        this.getNeighbours(accidentData.accidents[o])
        if (this.points.length > 1) {
          //neighbourhood of one point is not neighbouhood
          let hull = this.getHull(this.anchorPoint)
          //add neighbourhood object to array of neighbouhoods
          let neigh = {
            hullPoints: hull, //convexhull points
            points: [...this.points], //all neighbourhood points
            anchorPoint: this.anchorPoint
          }
          neigh.points.push(this.anchorPoint)
          this.neighbourhood.push(neigh)
        }
        //this.points = []
        while (this.points.length > 0) {
          //TODO???
          this.points.pop()
        } //empty the array
        this.anchorPoint = null
      })
    },
    //make polygon from convex hull array
    drawPolygon() {
      d3.selectAll('polygon').remove()
      this.polygons
        .selectAll('polygon')
        .data(this.neighbourhood)
        .attr('class', 'polygons')
        .enter()
        .append('polygon')
        .attr('points', function(d) {
          let str = ''
          d.hullPoints.forEach(o => {
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
        .on('click', d => {
          this.tooltip
            .style('opacity', 1.0)
            .html('Number of accidents in this area: ' + d.points.length)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
        })
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

      for (var i = 0; i < this.aggregatedData.length; i++) {
        this.aggregatedData[i].nodesInNeighbourhood.forEach(n => {
          let d = this.dataD3.accidents[n.indexInAccidentData]
          d.isInNeighbourhood = false
          /* console.log('lkadflak', n)
          d.x = n.x
          d.y = n.y */
          // somehow set d.x to nodes actual position in the
        })
        this.aggregatedData[i].nodesInNeighbourhood = []
      } //empty the array
      this.aggregatedData = []

      //neighbour data from convex hull
      for (i = 0; i < this.neighbourhood.length; i++) {
        let neighbourhood = {
          nodesInNeighbourhood: [],
          centerInGPS: null,
          centerInPx: null,
          other_stuff: null,
          id: i
        }
        this.neighbourhood[i].points.forEach(n => {
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
            Type: d.Type,
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
        })
        this.getNeighbourhoodCenter(neighbourhood)
        this.aggregatedData.push(neighbourhood)
      }
      //console.log('aggrData af', this.aggregatedData)
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
      this.makeNeighbourPolygons()
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
    colorNeighbourPoints() {
      this.nodes.attr('fill', d => {
        if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
          return '#487284d2'
        }
        return 'black'
      })
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
    //when proper zoom, find indicies of accidents which detail should be visualised
    createAccidentDetail() {
      this.detailAccidents = []
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)
      accidentData.accidents.forEach(o => {
        let posi = [o.x, o.y]
        if (
          posi[0] > 0 &&
          posi[0] < window.innerWidth &&
          posi[1] > 0 &&
          posi[1] < window.innerHeight
        ) {
          o.color = colorScale(o.Type)
          this.detailAccidents.push(o.index)
        }
      })
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
        .on('click', d => {
          this.tooltip
            .style('opacity', 1.0)
            .html(d.Type)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
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
            return colorScale(d.Type)
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
    },
    //updating aggregated vis. (house parties); called on zoom and move
    updateAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('g.neighbourhood-g')
        .transition(t)
        .attr('transform', d => {
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
        .transition(t)
        .attr('transform', d => {
          return 'translate(' + d.centerInPx[0] + ', ' + d.centerInPx[1] + ')'
        })

      for (var i = 0; i < this.aggregatedData.length; i++) {
        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .data(this.aggregatedData[i].nodesInNeighbourhood)
          .join('circle')
          .attr('class', 'circlesInAggregatedVis')
          .attr('r', 5)
          .attr('fill', d => {
            return colorScale(d.Type)
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
          })

        /* .exit()
          .each(d => {
            d.isInNeighbourhood = false
            let accidentNode = accidentData.accidents[d.indexInAccidentData]
            accidentNode.isInNeighbourhood = false
            delete accidentData.accidents[d.indexInAccidentData]
              .neighbourhoodPosition

            console.log('exit d', d)
            console.log('exit n', accidentNode)
          })
          .classed('neighbourhood', false)
          .classed('circlesInAggregatedVis', false)
          .classed('nodes', true)
          .attr('fill', 'black')
          .attr('r', 50)
          .remove() */

        this.initGrid(this.aggregatedData[i].nodesInNeighbourhood.length)

        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .transition(t)
          .each(d => {
            let gridpoint = occupyNearest(d, this.grid_cells[i])
            if (gridpoint) {
              let newX = gridpoint.x
              let newY = gridpoint.y

              d.x = gridpoint.x
              d.y = gridpoint.y
              let newForceGPS = viewport.unproject([newX, newY])
              let pos = viewport.project(newForceGPS)
              Vue.set(d, 'cx', pos[0])
              Vue.set(d, 'cy', pos[1])
              d.neighbourhoodPosition = [d.x, d.y]
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
      } //end of the extra big for cycle
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
            return colorScale(d.Type) //'black'
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

.tooltip {
  position: absolute;
  text-align: center;
  width: 90px;
  height: 50px;
  padding: 2px;
  font: 12px 'Avenir';
  font-weight: 470;
  background: #f4f5f4ee;
  border: 0px;
  border-radius: 8px;
  pointer-events: none;
  transform: translate(4px, -25px);
}

#main_svg {
  position: relative;
}

.circlesInAggregatedVis {
  stroke: rgb(255, 255, 255);
  stroke-width: 2px;
}
</style>
