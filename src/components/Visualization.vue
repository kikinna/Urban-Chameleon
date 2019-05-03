<template>
  <div>
    <AccidentDetail
      v-for="(curr_accident, index) in detailAccidents"
      :key="index"
      :accident="dataD3.accidents[curr_accident]"
      :index="index"
    ></AccidentDetail>

    <div class="control-pane urban-ui-border">
      <h2 class="ui-text">Unit visualization</h2>
      <b-select
        v-model="aggregatedVisSelected"
        @input="updateVisualizations"
        size="is-small"
        expanded
      >
        <option v-for="type in aggregatedVisTypes" :value="type" :key="type.id">{{ type }}</option>
      </b-select>

      <h2 class="ui-text">Primary attribute</h2>
      <section>
        <b-select
          v-model="primaryAttributeSelected"
          @input="changePrimaryAttribute"
          size="is-small"
        >
          <option v-for="type in primaryAttributeTypes" :value="type" :key="type.id">{{ type }}</option>
        </b-select>
      </section>

      <!-- <a class="button">Click me</a> -->
    </div>
    <div class="urban-ui-border" style="position: absolute; right:25px; bottom:25px; width: 100px;">
      <h2 class="ui-text">LEGEND</h2>
      <!-- <div v-for="(category, index) in primaryAttributeTypes" :key="index"> -->
      <div v-for="(color, index) in colors" :key="index">
        <svg width="15" height="10">
          <circle cx="5" cy="5" r="5" :fill="color" stroke="white" stroke-width="2px"></circle>
        </svg>
        <span style="font-size:small">{{ color }}</span>
      </div>
    </div>
  </div>
</template>
<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/accidents2018full.js'
import AccidentDetail from './AccidentDetail.vue'
import { EventBus } from '../helpers/EventBus.js'
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
import { distance } from '../helpers/kdTreeHelper.js'
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
      //neighbourhoodNodesInSVG: [], //array of neighbourhoods, each neighbourhood is an array containing nodes in aggregated vis
      dataD3: [], //accident data
      grid_cells: [], //array of cell arrays; each grid array contains barchart grid positions {x, y, occupied}
      simulation: null, //[], //null, //accident data force simulation
      svg: null, //d3 svg selection
      nodesOnMap: null, //accident nodes
      polygons: null, //svg polygon selection
      tooltip: null, //d3 tooltips
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
      numberOfCurrentNeighbourhoods: 0,
      aggregatedVisTypes: ['Waffle chart', 'Bar chart'],
      aggregatedVisSelected: 'Waffle chart',
      primaryAttributeTypes: [
        'Day',
        'DayNight',
        'Type',
        'CausedBy',
        'Alcohol',
        'MainCause',
        'RoadCondition',
        'Weather',
        'VehicleType',
        'Skyd'
      ],
      primaryAttributeSelected: 'Type',
      colors: ['red', 'blue', 'pink'],
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
      EventBus.$emit('neigh', this.accidentsOnScreenObj)
    }, 1)
    this.initialiseSVGelements()
    this.listeners()
    console.log('(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧')

    //add index attribute to easier access later
    for (var i = 0; i < accidentData.accidents.length; i++) {
      accidentData.accidents[i].theNeighbourhood = null
      accidentData.accidents[i].index = i
    }
    //points from which neighbourhood counting begin
    //this.startingPoints.push(1199)
    //this.startingPoints.push(478)
    this.computeNeighbourhoodsAndDrawPolygons()
    this.updateVisualizations()
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
        .join('circle')
        .each(d => {
          d.inNeighbourhood = false
        })
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          return colorScale(d[this.primaryAttributeSelected]) //'black'
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
            .html(d[this.primaryAttributeSelected])
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
        })

      // counts unique types of data in dataset
      this.listOfBarsTypeOfData = new Set(
        accidentData.accidents.map(node => node[this.primaryAttributeSelected])
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
        EventBus.$emit('neigh', this.accidentsOnScreenObj)
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
      //console.log('data', this.aggregatedData)
      this.updateNodesOnMap()
      this.drawPolygonUnderNeighbourhoods()
      this.moveAggregatedVis()
      //this.updateVisualizations()
    },
    zoomVisualizations() {
      this.removeNeighbourhoods()
      this.computeNeighbourhoodsAndDrawPolygons() //compute new neighbourhoods, make and draw polygons
      this.moveAggregatedVis()
      this.updateVisualizations()
    },
    //updates positions of aggregated visualizations (the g element)
    moveAggregatedVis() {
      const viewport = getViewport(this.$store.state.map)

      d3.selectAll('g.neighbourhood-g').attr('transform', d => {
        let pos = viewport.project(d.GPSpos) //(d.centerInGPS)
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
    computeNeighbourhoods() {
      let viewport = getViewport(this.$store.state.map)
      for (let i = 1; i < this.boundingBoxesIndices.length; i++) {
        if (this.boundingBoxesIndices[i] !== undefined) {
          let minX = viewport.unproject([
            this.boundingBoxesIndices[i][0][0],
            this.boundingBoxesIndices[i][0][1]
          ])
          let maxX = viewport.unproject([
            this.boundingBoxesIndices[i][1][0],
            this.boundingBoxesIndices[i][1][1]
          ])
          let minY = viewport.unproject([
            this.boundingBoxesIndices[i][2][0],
            this.boundingBoxesIndices[i][2][1]
          ])
          let maxY = viewport.unproject([
            this.boundingBoxesIndices[i][3][0],
            this.boundingBoxesIndices[i][3][1]
          ])
          let adepts = []
          this.computeAccidentsInBoundingBox(
            this.tree.root,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
          if (this.points.length > 4) {
            let hull = this.getConvexhull()
            for (let i = 0; i < adepts.length; i++) {
              if (this.isPointInPolygon(adepts[i], hull)) {
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
    computeAccidentsInBoundingBox(node, minX, maxX, minY, maxY, adepts) {
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

        let gIndex =
          (Math.floor(changed[1] * this.scale) * this.imData.width +
            Math.floor(changed[0] * this.scale)) *
            4 +
          1
        if (this.imData.data[gIndex] > 0) {
          this.addPointToNeighbourhood(node.obj.myIndex)
        } else {
          adepts.push(node.obj.myIndex)
        }
      }
      if (node.dimension % 2 === 0) {
        if (maxX[0] <= node.obj.X) {
          this.computeAccidentsInBoundingBox(
            node.left,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
        } else if (minX[0] >= node.obj.X) {
          this.computeAccidentsInBoundingBox(
            node.right,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
        } else {
          this.computeAccidentsInBoundingBox(
            node.left,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
          this.computeAccidentsInBoundingBox(
            node.right,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
        }
      } else {
        if (minY[1] <= node.obj.Y) {
          this.computeAccidentsInBoundingBox(
            node.left,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
        } else if (maxY[1] >= node.obj.Y) {
          this.computeAccidentsInBoundingBox(
            node.right,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
        } else {
          this.computeAccidentsInBoundingBox(
            node.left,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
          this.computeAccidentsInBoundingBox(
            node.right,
            minX,
            maxX,
            minY,
            maxY,
            adepts
          )
        }
      }
    },
    //updates positions of circles on map (regular accident data dots), called on zoom and move
    updateNodesOnMap() {
      const viewport = getViewport(this.$store.state.map)
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      d3.select('.nodesOnMap')
        .selectAll('circle')
        .data(this.accidentsOnScreenObj)
        .join('circle')
        .each(d => {
          d.isInNeighbourhood = false
        })
        .attr('r', this.nodeRadius)
        .attr('fill', d => {
          return colorScale(d[this.primaryAttributeSelected]) //'black'
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
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
        })
        .attr('class', d => {
          if (d.inNeighbourhood) {
            return 'neighbourhood'
          }
          return 'nodesOnMap'
        })
    },
    changePrimaryAttribute() {
      this.listOfBarsTypeOfData = new Set(
        accidentData.accidents.map(node => node[this.primaryAttributeSelected])
      )
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)
      this.nodesOnMap.attr('fill', d => {
        return colorScale(d[this.primaryAttributeSelected])
      })
      this.updateVisualizations()
    },
    //updates all visualizations - svg nodes, aggregated visualizations
    updateVisualizations() {
      this.initAggregatedVisData() // init DS for individual aggregated vis
      this.emptyAggrVisArrays() // empty array of grid cells before reinitializing it in the for loop for each neighbourhood
      this.drawOrUpdateAggregatedVis()

      //if (this.arrayForForceLayout.length > 0) this.runForceLayout()
      //TODO: remove visualisations and set this.isAggrVisInitialized to false on some zoom level

      this.transitionNodesFromAggrVisToMapToTheirPosition()
    },
    transitionNodesFromAggrVisToMapToTheirPosition() {
      //making nodes included in aggregated vis invisible in map
      this.nodesOnMap.attr('class', d => {
        if (d.inNeighbourhood) {
          return 'neighbourhood'
        }
        return 'nodesOnMap'
      })

      // animated transition of nodes in aggregated vis
      const t = d3
        .transition()
        .duration(1200)
        .ease(d3.easeLinear)

      const viewport = getViewport(this.$store.state.map)

      //aggrVis position
      this.nodesOnMap
        .attr('cx', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood) {
            return d.centerShift[0] + d.neighbourhoodPosition[0]
          }

          return d.x
        })
        .attr('cy', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood)
            return d.centerShift[1] + d.neighbourhoodPosition[1]
          return d.y
        })

      //GPS position
      this.nodesOnMap
        .transition(t)
        .attr('cx', d => {
          d.pos = viewport.project([d.X, d.Y])
          d.x = d.pos[0]
          d.y = d.pos[1]
          return d.x
        })
        .attr('cy', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood)
            d.neighbourhoodPosition = null
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
        //.style('fill', '#60bac668')
        .style('fill', '#777b7f68')
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
      for (var i = 0; i < this.aggregatedData.length; i++) {
        this.aggregatedData[i].nodesInNeighbourhood.forEach(n => {
          let d = this.dataD3.accidents[n.indexInAccidentData]
          d.inNeighbourhood = false
          Vue.set(d, 'centerShift', this.aggregatedData[i].centerInPx)
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
          min: null,
          max: null,
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
            Type: d[this.primaryAttributeSelected],
            primaryAttribute: d[this.primaryAttributeSelected],
            neighbourhoodID: 1, //idk
            center: [0, 0]
          }
          if (d.hasOwnProperty('neighbourhoodPosition')) {
            newNode.neighbourhoodPosition = d.neighbourhoodPosition
          }

          d.inNeighbourhood = true
          neighbourhood.nodesInNeighbourhood.push(newNode)
        })
        this.getNeighbourhoodCenter(neighbourhood)
        this.aggregatedData.push(neighbourhood)

        this.neighbourhood[i].points.forEach(n => {
          let center = [
            this.aggregatedData[i].centerInPx[0],
            this.aggregatedData[i].centerInPx[1]
          ]
          let d = accidentData.accidents[n]
          Vue.set(d, 'centerShift', center)
        })
      }
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

      let allEmptyBarsCount = 0

      for (var i = 0; i < data_structure.bars.length; i++) {
        data_structure.bar_counts[i] = array
          .map(node => node.primaryAttribute)
          .reduce(function(n, val) {
            return n + (val === data_structure.bars[i])
          }, 0)

        data_structure.bar_rows[i] = Math.ceil(
          data_structure.bar_counts[i] / GRID_COLS
        )

        if (data_structure.bar_counts[i] === 0) allEmptyBarsCount++
      }

      let arrayLen = array.length
      let CELL_SIZE = 10
      let GRID_COLS = Math.ceil(Math.max(...data_structure.bar_counts) / 10) //5
      if (GRID_COLS > 9) GRID_COLS = 9

      let GRID_ROWS = Math.ceil(array.length / GRID_COLS)

      let emptyBarsSoFarCount = 0
      let emptyCollsCount = 0
      let shift =
        (data_structure.bars.length - 1 - allEmptyBarsCount) *
        (GRID_COLS + 1) *
        (CELL_SIZE - 1)

      for (var bar = 0; bar < data_structure.bars.length; bar++) {
        const currentBarCells = []

        let cells_count = data_structure.bar_counts[bar]

        if (cells_count <= 0) {
          data_structure.chart_cells.push([])
          emptyBarsSoFarCount++
          continue
        }

        if (GRID_COLS - cells_count > 0) {
          emptyCollsCount += GRID_COLS - cells_count //TODO: -emptyCollsCount somewhere?
        }

        let start_x =
          (bar - emptyBarsSoFarCount) * (GRID_COLS + 1) * (CELL_SIZE - 1)

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
            cells_count--
          }
        }
        data_structure.chart_cells.push(currentBarCells)
      }

      //console.log('c', emptyCollsCount)
      this.grid_cells.push(data_structure)
    },
    //initialisation of grid for aggregated visualization - wafflechart
    initGridForWafflechart(array) {
      const data_structure = {
        typesOfData: [...this.listOfBarsTypeOfData],
        bars: [...this.listOfBarsTypeOfData],
        chart_cells: [],
        type_counts: []
      }

      let numberOfCells = 0

      for (var i = 0; i < data_structure.typesOfData.length; i++) {
        data_structure.type_counts[i] = array
          .map(node => node.primaryAttribute)
          .reduce(function(n, val) {
            return n + (val === data_structure.typesOfData[i])
          }, 0)

        numberOfCells += data_structure.type_counts[i]
      }
      let arrayLen = array.length

      let CELL_SIZE = 10
      let GRID_COLS = Math.ceil(numberOfCells / 10) //5
      if (GRID_COLS > 20) GRID_COLS = 20
      let GRID_ROWS = Math.ceil(array.length / GRID_COLS)
      let shiftX = (GRID_COLS * CELL_SIZE) / 2

      let counterArray = 0

      //let cells_count = data_structure.type_counts[type]
      //
      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          if (arrayLen <= 0) break

          var cell
          cell = {
            x: c * CELL_SIZE - shiftX,
            y: GRID_COLS - r * CELL_SIZE,
            occupied: false,
            waffleType: array[counterArray].primaryAttribute
          }
          data_structure.chart_cells.push(cell)
          arrayLen--
          counterArray++
        }
      }
      this.grid_cells.push(data_structure)
    },
    //Preparing things for new neighbourhood computing
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
      neighbourhood.min = viewport.project([minX, minY])
      neighbourhood.max = viewport.project([maxX, maxY])
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
    isPointInPolygon(point, polygon) {
      let x = accidentData.accidents[point].x
      let y = accidentData.accidents[point].y
      let inside = false
      let j = polygon.length - 1
      for (let i = 0; i < polygon.length; j = i++) {
        let xi = accidentData.accidents[polygon[i]].x
        let yi = accidentData.accidents[polygon[i]].y
        let xj = accidentData.accidents[polygon[j]].x
        let yj = accidentData.accidents[polygon[j]].y
        let intersect =
          yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
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
      let currentForceArray = []
      for (var i = 0; i < this.arrayForForceLayout.length; i++) {
        this.arrayForForceLayout[i].forEach(n => {
          currentForceArray.push(this.dataD3.accidents[n.indexInAccidentData])
        })
      }

      const currentSimulation = d3
        .forceSimulation()
        .nodes(currentForceArray)
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
      //.on('tick', this.tick)

      //this.simulation.push(currentSimulation)
      this.simulation = currentSimulation
      console.log('we run lol', currentSimulation)
      console.log('we run lol', currentForceArray)
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

      while (this.arrayForForceLayout.length > 0) {
        this.arrayForForceLayout.pop()
      }
    },
    //draws aggregated visualizations or updates them if they exists
    drawOrUpdateAggregatedVis() {
      // animated transition of nodes in aggregated vis
      // Possible shift to mounted? Maybe?
      const t = d3
        .transition()
        .duration(1200)
        .ease(d3.easeLinear)

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
          //return 'translate(' + d.centerInPx[0] + ', ' + d.centerInPx[1] + ')'
          d.pos = [d.centerInPx[0], (d.min[1] + d.centerInPx[1]) / 2]
          console.log('d.pos', d.pos)
          d.GPSpos = viewport.unproject(d.pos)
          return 'translate(' + d.pos[0] + ', ' + d.pos[1] + ')'
          //return 'translate(' + d.centerInPx[0] + ', ' + d.min[1] + ')'
        })
        .on('mouseover', d => {
          this.nodesOnMap.style('opacity', 0.7)
        })
        .on('mouseout', d => {
          this.nodesOnMap.style('opacity', 1)
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
            return colorScale(d.primaryAttribute)
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
              Vue.set(
                accidentData.accidents[d.indexInAccidentData],
                'centerShift',
                this.aggregatedData[i].centerInPx
              )
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
          .on('click', d => {
            this.tooltip
              .style('opacity', 1.0)
              .html(d.primaryAttribute)
              .style('left', d3.event.pageX + 'px')
              .style('top', d3.event.pageY - 28 + 'px')
          })
          .on('mouseout', d => {
            this.tooltip.style('opacity', 0)
          })

        // if (this.doYouWantSomeWafflesCowboy) {
        if (this.aggregatedVisSelected == 'Waffle chart') {
          this.initGridForWafflechart(
            this.aggregatedData[i].nodesInNeighbourhood
          )
        } else if (this.aggregatedVisSelected == 'Bar chart') {
          this.initGridForBarchart(this.aggregatedData[i].nodesInNeighbourhood)
        } else {
          //console.log('you dont have any chart selected')
        }

        // For each neighbourhood nodes find a position in a grid and move it there w/ transition
        currentNeighbourhoodSVGNodes
          .transition(t)
          .each(d => {
            let gridpoint
            // if (this.doYouWantSomeWafflesCowboy) {
            if (this.aggregatedVisSelected == 'Waffle chart') {
              gridpoint = occupyNearestWafflechart(d, this.grid_cells[i])
            } else if (this.aggregatedVisSelected == 'Bar chart') {
              gridpoint = occupyNearestBarchart(d, this.grid_cells[i])
            }
            if (gridpoint) {
              d.x = gridpoint.x
              d.y = gridpoint.y

              let currentNodeInAccData =
                accidentData.accidents[d.indexInAccidentData]
              currentNodeInAccData.neighbourhoodPosition = [d.x, d.y]
            }
          })
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
      } // end of that huge for cycle
      //console.log('please bro just go bro', this.grid_cells)
    }
  } // end of methods
}
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=IBM+Plex+Sans:Bold');
h2 {
  font-family: 'IBM Plex Sans', sans-serif;
}

.urban-ui-border {
  position: absolute;

  margin: 10px;
  padding: 15px;
  padding-top: 5px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  border-style: dashed;
  border-width: 2.5px;
}

.control-pane {
  bottom: 25px;
  left: 25px;
  /* position: relative; */
  width: 200px;
}

.ui-text {
  position: relative;
  font-size: small;
  letter-spacing: 0.1em;
  padding-top: 10px;
  padding-bottom: 5px;
}

.neighbourhood {
  visibility: hidden;
}

.polygons {
  fill: #b6158dcc;
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
