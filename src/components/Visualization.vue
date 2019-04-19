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
import accidentData from '../data/accidents2018.js'
import AccidentDetail from './AccidentDetail.vue'
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
import Vue from 'vue'

export default {
  name: 'Visualization',
  components: {
    AccidentDetail
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
      kdData:[],
      tree: [],
      accidentsOnScreenIndices: [], 
      accidentsOnScreenObj: [],
      wasScreenPoints: [],
      nodeRadius: 5,
      isAggrVisActive: false,
      recompute: false, //variable for recomputing neighbourhoods after moved map
      distanceLimit: 0.000001, //used in calculateDistanceDeviation to compare with the calculated distance between nodes
      isAggrVisInitialized: false, //flag for deciding if we should draw the aggregated vis or just update it
      doYouWantSomeWafflesCowboy: false, //TODO: temporary flag for deciding whether we want to draw waffle or barchart
      arrayForForceLayout: [], //array with the neighbourhood nodes, from neighbourhoods with less than 10 nodes
      listOfBarsTypeOfData: [] //used in barchart to order bars grouped by the type of data
    }
  },
  store,
  mounted() {
    //this.loadData()
    this.$store.state.map.getCanvasContainer().style.cursor = 'default'
    this.dataD3 = accidentData
    this.kdData = [...accidentData.accidents]
    this.initData()
    this.initialiseSVGelements()
    this.listeners()

    //preseting attributes of accidents for easier manipulation
    for (var i = 0; i < accidentData.accidents.length; i++) {
      accidentData.accidents[i].theNeighbourhood = null
      accidentData.accidents[i].myIndex = i
    }
    //points from which neighbourhood counting begin
    this.startingPoints.push(1199)
    this.startingPoints.push(478)
    this.computeNeighbourhoodsAndDrawPolygons()
    console.log('(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧')
    this.updateVisualizations()
    console.log('ლ(ಠ_ಠლ)')
  },
  methods: {
    //initialisation (svg, nodesOnMap, polygons, tooltips)
    initData(){
      const viewport = getViewport(this.$store.state.map)
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)
      let upL = viewport.unproject([0, 0])
      let downR = viewport.unproject([window.innerWidth, window.innerHeight])
      console.log(upL,downR)

      function distance(a, b) {
        let lat1 = a.Y;
        let lon1 = a.X;
        let lat2 = b.Y;
        let lon2 = b.X;
        let rad = Math.PI/180;
        let dLat = (lat2-lat1)*rad;
        let dLon = (lon2-lon1)*rad;
        lat1 = lat1*rad;
        lat2 = lat2*rad;
        let x = Math.sin(dLat/2);
        let y = Math.sin(dLon/2);
        let res = x*x + y*y * Math.cos(lat1) * Math.cos(lat2);
        return Math.atan2(Math.sqrt(res), Math.sqrt(1-res));
      }
      this.kdLibrary = require('kd-tree-javascript')
      for (let i = 0; i < accidentData.accidents.length; i++) {
        accidentData.accidents[i].myIndex = i;
      }
      this.tree = new this.kdLibrary.kdTree(this.kdData, distance, ["X", "Y"]);
      this.accidentsOnScreen(this.tree.root)
    },
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
          //this.removeNeighbours()
          this.accidentsOnScreenIndices.forEach(o => {
            accidentData.accidents[o].theNeighbourhood = null
          })
          this.startingPoints.push(d.myIndex)
          this.computeNeighbourhoodsAndDrawPolygons()
          console.log(this.startingPoints)
          //console.log(d)
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
      /* for (let i = 0; i < set.length; i++) {
        this.listOfBarsTypeOfData.push(
          accidentData.accidents
            .map(node => node.Type)
            .reduce(function(n, val) {
              return n + (val === set[i])
            }, 0)
        )
      } */

      this.transition = d3
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)

      //console.log('list', this.listOfBarsTypeOfData)
      //console.log('list', set)
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.kdTreepoints()
        this.removeNeighbourhoods() 
        this.moveVisualizations()
        //this.updateVisualizations()
        
      })
      this.$root.$on('map-move', () => {
        this.kdTreepoints()
        this.removeNeighbourhoods() 
        this.moveVisualizations()
      })
      this.$root.$on('map-zoomend', () => {
        this.zoomVisualizations()
      })
      this.$root.$on('map-moveend', () => {
        //called at the end of zoom and move
        //when zoom is big enough (https://www.youtube.com/watch?v=CCVdQ8xXBfk) , cards about accident detail are shown
        if (this.$store.state.map.getZoom() > 18.5) {
          this.createAccidentDetail()
        }
      })
    },
    kdTreepoints(){
      this.wasScreenPoints = [...this.accidentsOnScreenObj]
      this.accidentsOnScreenIndices = []
      this.accidentsOnScreenObj = []
      this.accidentsOnScreen(this.tree.root)
    },
    moveVisualizations() {
      this.updateNodesOnMap()
      this.drawPolygonUnderNeighbourhoods()
      this.moveAggregatedVis()
      //this.updateVisualizations()
    },
    zoomVisualizations() {
      //this.removeNeighbourhoods()
      //this.computeNeighbourhoodsAndDrawPolygons() //compute new neighbourhoods, make and draw polygons
      //this.moveAggregatedVis()
      //this.updateVisualizations()
    },
    //updates positions of aggregated visualizations (the g element)
    moveAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('g.neighbourhood-g').attr('transform', d => {
        let pos = viewport.project(d.centerInGPS)
        return 'translate(' + pos[0] + ', ' + pos[1] + ')'
      })
    },
    accidentsOnScreen(node){
      if(node === null){
        return
      }
      let viewport = getViewport(this.$store.state.map)
      let upL = viewport.unproject([0, 0])
      let downR = viewport.unproject([window.innerWidth, window.innerHeight]) 
      if(node.obj.X >= upL[0] && node.obj.X <= downR[0] && node.obj.Y <= upL[1] && node.obj.Y >= downR[1]){
        this.accidentsOnScreenIndices.push(node.obj.myIndex)
        this.accidentsOnScreenObj.push(node.obj)
      }
      if(node.dimension % 2 === 0){
        if(downR[0] <= node.obj.X){
          this.accidentsOnScreen(node.left)
        }
        else if(upL[0] >= node.obj.X){
          this.accidentsOnScreen(node.right)
        }
        else{
          this.accidentsOnScreen(node.left)
          this.accidentsOnScreen(node.right)
        }

      } else{
        if(upL[1] <= node.obj.Y){
          this.accidentsOnScreen(node.left)
        }
        else if(downR[1] >= node.obj.Y){
          this.accidentsOnScreen(node.right)
        }
        else{
          this.accidentsOnScreen(node.left)
          this.accidentsOnScreen(node.right)
        }
      }
    },

    //updates positions of circles on map (regular accident data dots), called on zoom and move
    updateNodesOnMap() {
      const viewport = getViewport(this.$store.state.map)

      this.nodesOnMap = this.svg
        .selectAll('circle')
        .filter(d => {
          let res = false
          this.wasScreenPoints.forEach( o => {
            if(o === d){
              res = true
              return
            }
          })
          return (res)
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

      this.nodesOnMap = this.svg
        .selectAll('circle')
        .filter(d => {
          let res = false
          this.wasScreenPoints.forEach( o => {
            if(o === d){
              res = true
              return
            }
          })
          return (!res)
        })
        .remove()

      this.nodesOnMap = this.svg
        .append('g')
        .attr('class', 'nodesOnMap')
        .selectAll('circle')
        .data(this.accidentsOnScreenObj.filter(d => {
          let res = false
          this.wasScreenPoints.forEach( o => {
            if(o === d){
              res = true
              return
            }
          })
          return !res
        }))
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
          accidentData.accidents.forEach(o => {
            accidentData.accidents.theNeighbourhood = null
          })
          this.startingPoints.push(d.myIndex)
          this.computeNeighbourhoodsAndDrawPolygons()
          console.log(this.startingPoints)
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

      this.transitionNodesFromAggrVisToMapToTheirPosition()
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
    //prepareing things for new neighbourhoods and stard calculating and make polygon
    computeNeighbourhoodsAndDrawPolygons() {
      this.startingPoints.forEach(d => {
        accidentData.accidents[d].theNeighbourhood =
          accidentData.accidents[d].OBJECTID
      })
      this.reverse = false
      this.anchorPoint = null
      while (this.neighbourhood.length > 0) {
        this.neighbourhood.pop()
      } //empty the array
      while (this.points.length > 0) {
        this.points.pop()
      } //empty the array
      this.computeNeighbourhoods()
      this.drawPolygonUnderNeighbourhoods()
    },
    //calculating neighbourhoods (right now from inserted 2 points, but it should start from one of points where houseparty has begun)
    computeNeighbourhoods() {
      this.startingPoints.forEach(o => {
        //mark all points which belonge to neighbouhood (attribute theNeighbourhood) and add to point array
        this.getNeighbours(accidentData.accidents[o])
        if (this.points.length > 2) {
          //neighbourhood of one point is not neighbouhood
          let hull = this.getConvexhull(this.anchorPoint)
          //add neighbourhood object to array of neighbouhoods
          let neigh = {
            hullPoints: hull, //convexhull points
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
      })
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
      //this.startingPoints = []
      this.neighbourhood = []
    },
    //recursive finding of neighbours and filling array of neighbourhood
    getNeighbours(obj) {
      let posiP2 = []
      this.addPointToNeighbourhood(obj.myIndex)
      let r = 22 //TODO zistit ako dostat presne cisla a ako to menit podla zoomu

      //looking through all points in data if its in close neighbourhood, if yes counting close neighbourhood also for them...
      this.accidentsOnScreenIndices.forEach(o => {
        if (accidentData.accidents[o].theNeighbourhood == null && accidentData.accidents[o] != obj) {
          let inNeighbour = Math.sqrt(
            Math.pow(obj.x - accidentData.accidents[o].x, 2) + Math.pow(obj.y - accidentData.accidents[o].y, 2)
          )
          if (inNeighbour <= r) {
            accidentData.accidents[o].theNeighbourhood = obj.theNeighbourhood
            this.getNeighbours(accidentData.accidents[o])
          }
        }
      })
      //this.colorNeighbourPoints()
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
      console.log(this.points)
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
                  accidentData.accidents[p].x == accidentData.accidents[ap].x &&
                  accidentData.accidents[p].y == accidentData.accidents[ap].y
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
          accidentData.accidents[o].color = colorScale(accidentData.accidents[o].Type)
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
        if (this.aggregatedData[i].nodesInNeighbourhood.length < 10) {
          this.arrayForForceLayout.push(
            this.aggregatedData[i].nodesInNeighbourhood
          ) //this.runForceLayout()
          continue
        }

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
        if (this.aggregatedData[i].nodesInNeighbourhood.length < 10) {
          this.arrayForForceLayout.push(
            this.aggregatedData[i].nodesInNeighbourhood
          ) //this.runForceLayout()
          continue
        }

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
