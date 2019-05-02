<template>
  <div>
    <svg></svg>
    <AccidentDetail
      v-for="(curr_accident, index) in detailAccidents"
      :key="index"
      :accident="dataD3.accidents[curr_accident]"
      :index="index"
    ></AccidentDetail>
  </div>
</template>
<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/accidents2018full.js'
import AccidentDetail from './AccidentDetail.vue'
import { EventBus } from './EventBus.js';
import {
  sortPoints,
  checkPoints,
  addPointToNeighbourhood,
  getAngle
} from '../helpers/neighbourhoodCountingHelper.js'
import {
  getViewport,
  measureGeoDistance
} from '../helpers/geoProjectionHelper.js'
import {
  occupyNearestWafflechart,
  occupyNearestBarchart,
  sortArrayAlphabetically
} from '../helpers/mathHelper.js'
import {
  distance
} from '../helpers/kdTreeHelper.js'
import Vue from 'vue'


export default {
  name: 'Visualization',
  components: {
    AccidentDetail,
  },
  data() {
    return {
      detailAccidents: [], //indices for detail card of accident
      points: [], //indices of points for countinginprogress neighbourhood
      neighbourhood: [], //array of neighbourhoods objects - hullPoints:indices of convex hull points, points:indices of all points, anchorpoint
      startingPoints: [], //points for visualization of neighbourhoods - just prototype
      anchorPoint: null, //anchor point of counting in progress neighbourhood
      reverse: false, //helper for angles in convexhull counting
      aggregatedData: [], //array of neighbourhoods, each neighbourhood is and array containing data for the nodes in aggregated vis
      //transition: null, //animated transition for all, uhuh, not working as intended
      neighbourhoodNodesInSVG: [], //array of neighbourhoods, each neighbourhood is an array containing nodes in aggregated vis
      dataD3: [], //accident data
      grid_cells: [], // barchart grid positions {x, y, occupied} //TODO: temporary
      simulation: null, // accident data force simulation
      svg: null,
      nodesOnMap: null, //accident nodes
      polygons: null,
      tooltip: null,
      kdLibrary: [],
      kdData: [],
      tree: [],
      accidentsOnScreenIndices: [],
      accidentsOnScreenObj: [],
      wasScreenPoints: [],
      nodeRadius: 5, //default node radius
      isAggrVisInitialized: false, //flag for deciding if we should draw the aggregated vis or just update it
      doYouWantSomeWafflesCowboy: false, //TODO: temporary flag for deciding whether we want to draw waffle or barchart
      arrayForForceLayout: [], //array with the neighbourhood nodes, from neighbourhoods with less than 10 nodes
      listOfBarsTypeOfData: [], //used in barchart to order bars grouped by the type of data
      neighbourhoods: [],
      boundingBoxesIndices: [],
      imData: [],
      scale: null,
      indexies: [],
      moved: true,
      upL: null,
      downR: null
    }
  },
  store,
  mounted() {
    console.log('ლ(ಠ_ಠლ)')
    this.$store.state.map.getCanvasContainer().style.cursor = 'default'
    this.dataD3 = accidentData
    this.kdData = [...accidentData.accidents]

    this.initData()

    setTimeout(() => {
        // console.log('finished drawing')
        console.log('dnu')
        EventBus.$emit('neigh', this.accidentsOnScreenObj);
    }, 1)
    this.initialiseSVGelements()
    this.listeners()
    console.log('(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧')

  },
  methods: {
    //creating kdTree and initialising data on screen
    initData() {
      let viewport = getViewport(this.$store.state.map)
      this.upL = viewport.unproject([0, 0])
      this.downR = viewport.unproject([window.innerWidth, window.innerHeight])
      //preseting attributes of accidents for easier manipulation
      for (var i = 0; i < accidentData.accidents.length; i++) {
        accidentData.accidents[i].theNeighbourhood = null
        accidentData.accidents[i].myIndex = i
      }

      this.kdLibrary = require('kd-tree-javascript')

      this.tree = new this.kdLibrary.kdTree(this.kdData, distance, ['X', 'Y'])
      this.recomputeAccidentsOnScreen(this.tree.root)
      console.log('koniecInit')
    },
    //initialisation (svg, nodesOnMap, polygons, tooltips)
    initialiseSVGelements() {
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

      this.tooltip = d3
        .select(this.$store.state.map.getCanvasContainer()) //'map'
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)

      this.nodesOnMap = this.svg
        .append('g')
        .attr('class', 'nodesOnMap')
        .selectAll('circle')
        .data(this.accidentsOnScreenObj)
        .enter()
        .append('circle')
        .each(d => {
          d.isInNeighbourhood = false
        })
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          return 'black'
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
          this.tooltip
            .style('opacity', 1.0)
            .html(d.Type)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
        })

      this.listOfBarsTypeOfData = new Set(
        accidentData.accidents.map(node => node.Type)
      )
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.updatePoints()
        this.moveVisualizations()
      })
      this.$root.$on('map-move', () => {
        this.updatePoints()
        this.moveVisualizations()
      })
      this.$root.$on('map-zoomend', () => {
        //this.zoomed = true
        // this.zoomVisualizations()
      })
      this.$root.$on('map-moveend', () => {
        //called at the end of zoom and move
        //when zoom is big enough (https://www.youtube.com/watch?v=CCVdQ8xXBfk) , cards about accident detail are shown
        if (this.$store.state.map.getZoom() > 18.5) {
          this.createAccidentDetail()
        }
        this.moved = true
        EventBus.$emit('neigh', this.accidentsOnScreenObj);
      })
      //event for comunication between Visualisation and GaussPreprocess
      EventBus.$on('emittedEvent', data => {
            this.boundingBoxesIndices = data.boundingBoxes
            this.scale = data.scale
            this.imData = this.$store.state.neighbourhoodImage
            this.computeNeighbourhoodsAndDrawPolygons()
            this.moveAggregatedVis()
            this.updateVisualizations()
            this.moved = false
      })
    },
    //update accidents on screen
    updatePoints() {
      this.wasScreenPoints = [...this.accidentsOnScreenObj]
      this.accidentsOnScreenIndices = []
      this.accidentsOnScreenObj = []
      //set latitude and longitude for left up and right down point
      let viewport = getViewport(this.$store.state.map)
      this.upL = viewport.unproject([0, 0])
      this.downR = viewport.unproject([window.innerWidth, window.innerHeight])
      this.recomputeAccidentsOnScreen(this.tree.root)
    },
    moveVisualizations() {
      this.updateNodesOnMap()
      this.drawPolygonUnderNeighbourhoods()
      this.updateVisualizations()
    },
    //updates positions of aggregated visualizations (the g element)
    moveAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('g.neighbourhood-g').attr('transform', d => {
        let pos = viewport.project(d.centerInGPS)
        return 'translate(' + pos[0] + ', ' + pos[1] + ')'
      })
    },
    recomputeAccidentsOnScreen(node) {
      if (node === null) {
        return
      }
      if (
        node.obj.X >= this.upL[0] &&
        node.obj.X <= this.downR[0] &&
        node.obj.Y <= this.upL[1] &&
        node.obj.Y >= this.downR[1]
      ) {
        this.accidentsOnScreenIndices.push(node.obj.myIndex)
        this.accidentsOnScreenObj.push(node.obj)
      }
      if (node.dimension % 2 === 0) {
        if (this.downR[0] <= node.obj.X) {
          this.recomputeAccidentsOnScreen(node.left)
        } else if (this.upL[0] >= node.obj.X) {
          this.recomputeAccidentsOnScreen(node.right)
        } else {
          this.recomputeAccidentsOnScreen(node.left)
          this.recomputeAccidentsOnScreen(node.right)
        }
      } else {
        if (this.upL[1] <= node.obj.Y) {
          this.recomputeAccidentsOnScreen(node.left)
        } else if (this.downR[1] >= node.obj.Y) {
          this.recomputeAccidentsOnScreen(node.right)
        } else {
          this.recomputeAccidentsOnScreen(node.left)
          this.recomputeAccidentsOnScreen(node.right)
        }
      }
    },
    //get all neighbourhoods on screen from bounding boxes precalculated in imagePreprocess
    computeNeighbourhoods(){
      let viewport = getViewport(this.$store.state.map)
      for(let i = 1; i < this.boundingBoxesIndices.length; i++){
        if(this.boundingBoxesIndices[i]!== undefined){
          let minX = viewport.unproject([this.boundingBoxesIndices[i][0][0],
                                         this.boundingBoxesIndices[i][0][1]] )
          let maxX = viewport.unproject([this.boundingBoxesIndices[i][1][0],
                                         this.boundingBoxesIndices[i][1][1]] )
          let minY = viewport.unproject([this.boundingBoxesIndices[i][2][0],
                                         this.boundingBoxesIndices[i][2][1]] )
          let maxY = viewport.unproject([this.boundingBoxesIndices[i][3][0],
                                         this.boundingBoxesIndices[i][3][1]] )
          let adepts = []
          this.computeAccidentsInBoundingBox(this.tree.root,minX,maxX,minY,maxY, adepts)
          if (this.points.length > 4) {
            let hull = this.getConvexhull()
            for(let i = 0; i < adepts.length; i++){
              if(this.isPointInPolygon(adepts[i], hull)){
                this.points.push(adepts[i])
              }
            }
            let neigh = {
              hullPoints: hull, //convexhull points
              //adepts: [...adepts], //accident which was in the boundingbox but not in the blob
              points: [...this.points], //all neighbourhood points
              anchorPoint: this.anchorPoint
            }
            neigh.points.push(this.anchorPoint)
            this.neighbourhood.push(neigh)
          }
        while (this.points.length > 0) {
          this.points.pop()
          } //empty the array
          this.anchorPoint = null
        }
      }

    },
    //get all points lying in bounding box
    computeAccidentsInBoundingBox(node,minX,maxX,minY,maxY, adepts){
      if (node === null) {
        return
      }
      if (
        node.obj.X >= minX[0] &&
        node.obj.X <= maxX[0] &&
        node.obj.Y <= minY[1] &&
        node.obj.Y >= maxY[1]
      ) {
        let viewport = getViewport(this.$store.state.map)
        let changed = viewport.project([node.obj.X, node.obj.Y])

        let gIndex = (Math.floor(changed[1]*this.scale)*this.imData.width + Math.floor(changed[0]*this.scale)) * 4 + 1
        if(this.imData.data[gIndex] > 0){
          this.addPointToNeighbourhood(node.obj.myIndex)
        }else{
          adepts.push(node.obj.myIndex)
        }
      }
      if (node.dimension % 2 === 0) {
        if (maxX[0] <= node.obj.X) {
          this.computeAccidentsInBoundingBox(node.left,minX,maxX,minY,maxY, adepts)
        } else if (minX[0] >= node.obj.X) {
          this.computeAccidentsInBoundingBox(node.right,minX,maxX,minY,maxY, adepts)
        } else {
          this.computeAccidentsInBoundingBox(node.left,minX,maxX,minY,maxY, adepts)
          this.computeAccidentsInBoundingBox(node.right,minX,maxX,minY,maxY, adepts)
        }
      } else {
        if (minY[1] <= node.obj.Y) {
          this.computeAccidentsInBoundingBox(node.left,minX,maxX,minY,maxY, adepts)
        } else if (maxY[1] >= node.obj.Y) {
          this.computeAccidentsInBoundingBox(node.right,minX,maxX,minY,maxY, adepts)
        } else {
          this.computeAccidentsInBoundingBox(node.left,minX,maxX,minY,maxY, adepts)
          this.computeAccidentsInBoundingBox(node.right,minX,maxX,minY,maxY, adepts)
        }
      }
    },

    //updates positions of circles on map (regular accident data dots), called on zoom and move
    updateNodesOnMap() {
      const viewport = getViewport(this.$store.state.map)

      d3.select('.nodesOnMap')
        .selectAll('circle')
        .data(this.accidentsOnScreenObj)
        .join('circle')
        .each(d => {
          d.isInNeighbourhood = false
        })
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          return 'black'
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
          this.tooltip
            .style('opacity', 1.0)
            .html(d.Type)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
        })
    },
    //updates all visualizations - svg nodes, aggregated visualizations
    updateVisualizations() {
      this.updateNodesOnMap()
      if (!this.isAggrVisInitialized) {
        //this.doYouWantSomeWafflesCowboy = true
        this.drawAggregatedVis()
        this.isAggrVisInitialized = true
      } else {
        this.updateAggregatedVis()
      }
      //this.runForceLayout()
      //TODO: remove visualisations and set this.isAggrVisInitialized to false on some zoom level
      //making nodes included in aggregated vis invisible in map
      this.nodesOnMap.attr('class', d => {
        if (d.isInNeighbourhood) {
          return 'neighbourhood'
        }
        return 'nodesOnMap'
      })

      //this.transitionNodesFromAggrVisToMapToTheirPosition()
    },
    transitionNodesFromAggrVisToMapToTheirPosition() {
      // animated transition of nodes in aggregated vis
      const t = d3
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)

      const viewport = getViewport(this.$store.state.map)

      //aggrVis position
      this.nodesOnMap
        .attr('cx', d => {
          if (!d.neighbourhoodPosition && !d.centerShift) return d.x
          if (d.ID === 60206182319) {
            console.log('af pos', d.pos[0])
            console.log('af x', d.x)
            console.log('af c', d.centerShift[0])
          }
          //d.forceGPS = viewport.unproject([d.x, d.y])

          return d.centerShift[0] //d.x - d.pos[0] - d.centerShift[0] //d.pos[0] //+ d.x - d.centerShift[0]
        })
        .attr('cy', d => {
          if (!d.neighbourhoodPosition && !d.centerShift) return d.y
          return d.centerShift[1] //d.y - d.pos[1] - d.centerShift[1] //+ d.y + d.centerShift[1] //d.cy
        })
        .attr('r', d => {
          if (!d.neighbourhoodPosition && !d.centerShift) return 5
          return 500
        })

      this.nodesOnMap
        .transition(t)
        .attr('cx', function(d) {
          if (!d.neighbourhoodPosition && !d.centerShift) return d.x
          d.x = viewport.project(d.forceGPS)[0]
          return d.x
        })
        .attr('cy', function(d) {
          if (!d.neighbourhoodPosition && !d.centerShift) return d.y
          d.y = viewport.project(d.forceGPS)[1]
          delete d.neighbourhoodPosition
          delete d.centerShift
          return d.y
        })
    },
    //prepareing things for new neighbourhoods, start computatin and make polygon underneath
    computeNeighbourhoodsAndDrawPolygons() {
      this.removeNeighbourhoods()
      this.computeNeighbourhoods()
      this.drawPolygonUnderNeighbourhoods()
    },
    
    //make polygon from convex hull of neighbourhood array
    drawPolygonUnderNeighbourhoods() {
      d3.selectAll('polygon').remove()
      let that = this
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
    //should work with array of node indexes from convex hull
    // TO DO : Prep of ds + adding necessary attributes + rename, haha
    initAggregatedVisData() {
      //console.log('aggrData bef bef', this.aggregatedData)

      for (var i = 0; i < this.aggregatedData.length; i++) {
        this.aggregatedData[i].nodesInNeighbourhood.forEach(n => {
          let d = accidentData.accidents[n.indexInAccidentData]
          d.isInNeighbourhood = false
          //d.gridCandidate = null
          //d.gridIndex = null
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
          let d = accidentData.accidents[n]

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
            neighbourhoodPosition: d.neighbourhoodPosition,
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
    //initialisation of grid for aggregated visualization - barchart
    initGridForBarchart(array) {
      const data_structure = {
        bars: [...this.listOfBarsTypeOfData], //[...new Set(array.map(node => node.Type))],
        bar_counts: [],
        bar_rows: [], // not used anywhere lol
        chart_cells: [],
        barColls: 0
      }

      for (var i = 0; i < data_structure.bars.length; i++) {
        data_structure.bar_counts[i] = array
          .map(node => node.Type)
          .reduce(function(n, val) {
            return n + (val === data_structure.bars[i])
          }, 0)

        data_structure.bar_rows[i] = Math.ceil(
          data_structure.bar_counts[i] / GRID_COLS
        )
      }

      //console.log('rows', data_structure.bar_rows)
      //console.log('counts', data_structure.bar_counts)

      let arrayLen = array.length
      let CELL_SIZE = 10
      let GRID_COLS = Math.ceil(Math.max(...data_structure.bar_counts) / 10) //5
      if (GRID_COLS > 9) GRID_COLS = 9

      let GRID_ROWS = Math.ceil(array.length / GRID_COLS) // = data_structure.bar_rows[0] //
      //let start_x = 0
      //console.log('cols', GRID_COLS)
      //console.log('rows', GRID_ROWS)

      //const currentBarchart = []

      let emptyBarsCount = 0
      let emptyCollsCount = 0

      let shift =
        (data_structure.bars.length - 1) * (GRID_COLS + 1) * (CELL_SIZE - 1)

      for (var bar = 0; bar < data_structure.bars.length; bar++) {
        /* GRID_COLS = data_structure.bar_counts[0]
        GRID_ROWS = Math.ceil(array.length / GRID_COLS)
        console.log('rows', GRID_COLS)
        console.log('counts', GRID_ROWS)
        console.log('ds', data_structure) */
        // console.log("This is bar ", bar);
        //this.cells[bar] = []
        const currentBarCells = []
        //let bar_cells = []

        let cells_count = data_structure.bar_counts[bar]

        if (cells_count <= 0) {
          data_structure.chart_cells.push([])
          emptyBarsCount++
          continue
        }

        if (GRID_COLS - cells_count > 0) {
          emptyCollsCount += GRID_COLS - cells_count //TODO: -emptyCollsCount somewhere?
        }
        //GRID_COLS = Math.ceil(data_structure.bar_counts[bar] / 10)
        //GRID_ROWS = Math.ceil(arrayLen / GRID_COLS)

        //GRID_COLS = Math.ceil(cells_count / 5) //Math.ceil(cells_count / 5)
        //console.log('cols', GRID_COLS)
        //GRID_ROWS = Math.ceil(arrayLen / GRID_COLS)

        // console.log(cells_count);
        // console.log("cells_count ", cells_count);

        let start_x = (bar - emptyBarsCount) * (GRID_COLS + 1) * (CELL_SIZE - 1)
        //start_x += bar * (GRID_COLS + 1) //+ bar * 10
        //console.log('start_x', start_x)

        for (var r = 0; r < GRID_ROWS; r++) {
          for (var c = 0; c < GRID_COLS; c++) {
            if (cells_count <= 0) continue

            var cell
            cell = {
              x: start_x + c * CELL_SIZE - shift / 2,
              y: GRID_COLS - r * CELL_SIZE,
              occupied: false
            }

            currentBarCells.push(cell)
            // bar_cells.push(cell);
            cells_count--
            // console.log(cells_count);
          }
        }
        data_structure.chart_cells.push(currentBarCells)
      }

      //console.log('c', emptyCollsCount)
      this.grid_cells.push(data_structure)
    },
    //initialisation of grid for aggregated visualization - wafflechart
    initGridForWafflechart(array) {
      let CELL_SIZE = 10
      let GRID_COLS = 5

      const data_structure = {
        typesOfData: [...this.listOfBarsTypeOfData],
        bars: [...this.listOfBarsTypeOfData],
        chart_cells: [],
        type_counts: []
      }

      let GRID_ROWS = Math.ceil(array.length / GRID_COLS)

      for (var i = 0; i < data_structure.typesOfData.length; i++) {
        data_structure.type_counts[i] = array
          .map(node => node.Type)
          .reduce(function(n, val) {
            return n + (val === data_structure.typesOfData[i])
          }, 0)
      }
      let arrayLen = array.length

      //for (var type = 0; type < data_structure.typesOfData.length; type++) {
      //const currentBarCells = []
      let counterArray = 0

      //let cells_count = data_structure.type_counts[type]
      //
      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          //if (cells_count <= 0) continue
          if (arrayLen <= 0) break

          var cell
          cell = {
            x: c * CELL_SIZE,
            y: GRID_COLS - r * CELL_SIZE,
            occupied: false,
            waffleType: array[counterArray].Type
          }
          data_structure.chart_cells.push(cell)
          arrayLen--
          counterArray++
        }
      }

      //}
      this.grid_cells.push(data_structure)

      //console.log('ds', data_structure)
    },
    //Prepareing things for new neighbourhood computing
    removeNeighbourhoods() {
      this.accidentsOnScreenIndices.forEach(o => {
        accidentData.accidents[o].theNeighbourhood = null
      })
      this.anchorPoint = null
      while (this.neighbourhood.length > 0) {
        this.neighbourhood.pop()
      } //empty the array
      while (this.points.length > 0) {
        this.points.pop()
      } //empty the array
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
    //creating convex hull of neighbourhood points when neighbourhood is containing 3 or more accidents
    getConvexhull() {
      let hullPoints = []
      let pointis = []
      let pointsLength = null
      let that = this

      sortPoints(this.anchorPoint, this.points, this)

      pointis = [...this.points]
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
        if (!(pointis.length > 0)) {
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
                  accidentData.accidents[p].x == accidentData.accidents[ap].x &&
                  accidentData.accidents[p].y == accidentData.accidents[ap].y
                )
              })
            ) {
              hullPoints.unshift(this.anchorPoint)
            }
            return hullPoints
          }
          pointis = [...hullPoints]
          pointsLength = pointis.length
          hullPoints = []
          hullPoints.push(pointis.shift(), pointis.shift())
        }
        hullPoints.push(pointis.shift())
        p0 = hullPoints[hullPoints.length - 3]
        p1 = hullPoints[hullPoints.length - 2]
        p2 = hullPoints[hullPoints.length - 1]
        if (checkPoints(p0, p1, p2, this)) {
          hullPoints.splice(hullPoints.length - 2, 1)
        }
        if (!(pointis.length > 0)) {
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
                  accidentData.accidents[p].x == accidentData.accidents[ap].x &&
                  accidentData.accidents[p].y == accidentData.accidents[ap].y
                )
              })
            ) {
              hullPoints.unshift(this.anchorPoint)
            }
            return hullPoints
          }
          pointis = [...hullPoints]
          pointsLength = pointis.length
          hullPoints = []
          hullPoints.push(pointis.shift(), pointis.shift())
        }
      }
    },
    //returning true if point which was not in hull lies inside the polygon
    isPointInPolygon(point,polygon){
      let x = accidentData.accidents[point].x
      let y = accidentData.accidents[point].y
      let inside = false
      let j = polygon.length -1
      for(let i = 0 ; i < polygon.length; j = i++){
        let xi = accidentData.accidents[polygon[i]].x
        let yi = accidentData.accidents[polygon[i]].y
        let xj = accidentData.accidents[polygon[j]].x
        let yj = accidentData.accidents[polygon[j]].y
        let intersect = ((yi > y) != (yj > y))
                        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if (intersect) {
          inside = !inside
        }
      }
      return inside
    },
    addPointToNeighbourhood(index) {
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
      this.accidentsOnScreenIndices.forEach(o => {
        let posi = [accidentData.accidents[o].x, accidentData.accidents[o].y]
        if (
          posi[0] > 0 &&
          posi[0] < window.innerWidth &&
          posi[1] > 0 &&
          posi[1] < window.innerHeight
        ) {
          accidentData.accidents[o].color = colorScale(
            accidentData.accidents[o].Type
          )
          this.detailAccidents.push(accidentData.accidents[o].myIndex)
        }
      })
    },
    runForceLayout() {
      const currentSimulation = d3
        .forceSimulation()
        .nodes(this.arrayForForceLayout)
        .force(
          'center',
          d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2)
        )
        .force(
          'collide',
          d3
            .forceCollide()
            .radius(this.nodeRadius * 2)
            .strength(1)
            .iterations(1)
        )
        .on('tick', this.tick)

      //this.simulation.push(currentSimulation)
      this.simulation = currentSimulation
    },
    tick() {
      const viewport = getViewport(this.$store.state.map)

      this.nodesOnMap
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
    emptyAggrVisArrays() {
      while (this.grid_cells.length > 0) {
        this.grid_cells.pop()
      }

      while (this.neighbourhoodNodesInSVG.length > 0) {
        this.neighbourhoodNodesInSVG.pop()
      }

      while (this.arrayForForceLayout.length > 0) {
        this.arrayForForceLayout.pop()
      }
    },
    drawAggregatedVis() {
      this.initAggregatedVisData()
      this.emptyAggrVisArrays()

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

      // Setup
      for (var i = 0; i < this.aggregatedData.length; i++) {
        /* if (this.aggregatedData[i].nodesInNeighbourhood.length < 10) {
          this.arrayForForceLayout.push(
            this.aggregatedData[i].nodesInNeighbourhood
          ) //this.runForceLayout()
          continue
        } */

        this.aggregatedData[i].nodesInNeighbourhood = sortArrayAlphabetically(
          this.aggregatedData[i].nodesInNeighbourhood
        )

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
            Vue.set(
              accidentData.accidents[d.indexInAccidentData],
              'centerShift',
              this.aggregatedData[i].centerInPx
            )
            return d.pos[0] - this.aggregatedData[i].centerInPx[0]
          })
          .attr('cy', d => {
            d.y = d.pos[1]
            return d.pos[1] - this.aggregatedData[i].centerInPx[1]
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

        if (this.doYouWantSomeWafflesCowboy) {
          this.initGridForWafflechart(
            this.aggregatedData[i].nodesInNeighbourhood
          )
        } else {
          this.initGridForBarchart(this.aggregatedData[i].nodesInNeighbourhood)
        }

        //console.log('please bro just go bro', this.grid_cells)

        // For each neighbourhood nodes find a position in a grid and move it there w/ transition
        currentNeighbourhoodSVGNodes
          .transition(t)
          .each(d => {
            let gridpoint

            if (this.doYouWantSomeWafflesCowboy) {
              gridpoint = occupyNearestWafflechart(d, this.grid_cells[i])
            } else {
              gridpoint = occupyNearestBarchart(d, this.grid_cells[i])
            }
            if (gridpoint) {
              d.x = gridpoint.x
              d.y = gridpoint.y

              let currentNodeInAccData =
                accidentData.accidents[d.indexInAccidentData]
              currentNodeInAccData.neighbourhoodPosition = [d.x, d.y]
              //currentNodeInAccData.neighbourhoodPosition = [d.x, d.y] HERE
              //d.neighbourhoodPosition = [d.x, d.y]
              //d.forceGPS = viewport.unproject([d.x, d.y])
              //console.log(currentNodeInAccData)
              //accidentData.accidents[d.id].neighbourhoodPosition = [d.x, d.y]
              //Vue.set(currentNodeInAccData, 'neighbourhoodPosition', [d.x, d.y])
              /* Vue.set(accidentData.accidents[d.id], 'neighbourhoodPosition', [
                d.x,
                d.y
              ]) */
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        this.neighbourhoodNodesInSVG.push(currentNeighbourhoodSVGNodes)
      } // end of that huge for cycle
      //console.log('please bro just go bro', this.grid_cells)
    },
    //updating aggregated vis. (house parties)
    updateAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('g.neighbourhood-g')
        .transition(t)
        .attr('transform', d => {
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
      this.emptyAggrVisArrays() // empty array of grid cells before reinitializing it in the for loop for each neighbourhood

      //console.log('grid', this.grid_cells)

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
        /* if (this.aggregatedData[i].nodesInNeighbourhood.length < 10) {
          this.arrayForForceLayout.push(
            this.aggregatedData[i].nodesInNeighbourhood
          ) //this.runForceLayout()
          continue
        } */

        this.aggregatedData[i].nodesInNeighbourhood = sortArrayAlphabetically(
          this.aggregatedData[i].nodesInNeighbourhood
        )

        let currentAggregatedVis = d3
          .select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .data(this.aggregatedData[i].nodesInNeighbourhood)

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
              //d.centerShift = this.aggregatedData[i].centerInPx
              Vue.set(
                accidentData.accidents[d.indexInAccidentData],
                'centerShift',
                this.aggregatedData[i].centerInPx
              )
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

        if (this.doYouWantSomeWafflesCowboy) {
          this.initGridForWafflechart(
            this.aggregatedData[i].nodesInNeighbourhood
          )
        } else {
          this.initGridForBarchart(this.aggregatedData[i].nodesInNeighbourhood)
        }

        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .transition(t)
          .each(d => {
            let gridpoint

            if (this.doYouWantSomeWafflesCowboy) {
              gridpoint = occupyNearestWafflechart(d, this.grid_cells[i])
            } else {
              gridpoint = occupyNearestBarchart(d, this.grid_cells[i])
            }
            let currentNodeInAccData =
              accidentData.accidents[d.indexInAccidentData]

            /*if (currentNodeInAccData.gridCandidate) {
              console.log('actually got ere')
              gridpoint = currentNodeInAccData.gridCandidate
              let gridIndex = currentNodeInAccData.gridIndex

              this.grid_cells[i][gridIndex].occupied = true
            } else {
              gridpoint = occupyNearest(d, this.grid_cells[i])
            } */

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
              accidentData.accidents[
                d.indexInAccidentData
              ].neighbourhoodPosition = [d.x, d.y]

              Vue.set(d, 'neighbourhoodPosition', [d.x, d.y])
              Vue.set(currentNodeInAccData, 'neighbourhoodPosition', [d.x, d.y])
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
      } //end of the extra big for cycle
    }
  } // end of methods
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

.nodesOnMap {
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
