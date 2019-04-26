<template>
  <div>
    <svg></svg>
    <AccidentDetail
      v-for="(curr_accident, index) in detailAccidents"
      :key="index"
      :accident="dataD3.accidents[curr_accident]"
      :index="index"
    ></AccidentDetail>

    <div class="control-pane urban-ui-border">
      <h2 class="ui-text">Unit visualization</h2>
      <b-select v-model="aggregatedVisSelected" size="is-small" expanded>
        <option v-for="type in aggregatedVisTypes" :value="type" :key="type.id">{{ type }}</option>
      </b-select>

      <h2 class="ui-text">Primary attribute</h2>
      <section>
        <b-select v-model="primaryAttributeSelected" size="is-small">
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
      grid_cells: [], //array of cell arrays; each grid array contains barchart grid positions {x, y, occupied}
      simulation: null, //[], //null, //accident data force simulation
      svg: null, //d3 svg selection
      nodesOnMap: null, //accident nodes
      polygons: null, //svg polygon selection
      tooltip: null, //d3 tooltips
      tree: [],
      nodeRadius: 5, //default node radius
      isAggrVisInitialized: false, //flag for deciding if we should draw the aggregated vis or just update it
      doYouWantSomeWafflesCowboy: false, //TODO: temporary flag for deciding whether we want to draw waffle or barchart
      arrayForForceLayout: [], //array with the neighbourhood nodes, from neighbourhoods with less than 10 nodes
      listOfBarsTypeOfData: [], //used in barchart to order bars grouped by the type of data
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
      colors: ['red', 'blue', 'pink']
    }
  },
  store,
  mounted() {
    //this.loadData()
    this.$store.state.map.getCanvasContainer().style.cursor = 'default'
    this.dataD3 = accidentData
    this.initialiseSVGelements()
    this.listeners()

    //add index attribute to easier access later
    for (var i = 0; i < accidentData.accidents.length; i++) {
      accidentData.accidents[i].theNeighbourhood = null
      accidentData.accidents[i].index = i
    }
    //points from which neighbourhood counting begin
    this.startingPoints.push(1199)
    this.startingPoints.push(478)
    this.computeNeighbourhoodsAndDrawPolygons()
    this.updateVisualizations()
  },
  methods: {
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
        .data(this.dataD3.accidents)
        .join('circle')
        .each(d => {
          d.inNeighbourhood = false
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
          /* accidentData.accidents.forEach(o => {
            o.theNeighbourhood = null
          })
          this.startingPoints.push(d.index)
          console.log('st', this.startingPoints)
          this.computeNeighbourhoodsAndDrawPolygons()
          this.zoomVisualizations() */

          this.tooltip
            .style('opacity', 1.0)
            .html(d.Type)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        })
        .on('mouseout', d => {
          this.tooltip.style('opacity', 0)
        })

      // counts how many types of data there is
      this.listOfBarsTypeOfData = new Set(
        accidentData.accidents.map(node => node.Type)
      )
    },
    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.moveVisualizations()
      })
      this.$root.$on('map-move', () => {
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
        let pos = viewport.project(d.centerInGPS)
        return 'translate(' + pos[0] + ', ' + pos[1] + ')'
      })
    },
    //updates positions of circles on map (regular accident data dots), called on zoom and move
    updateNodesOnMap() {
      const viewport = getViewport(this.$store.state.map)

      this.nodesOnMap
        .attr('cx', d => {
          //d.forceGPS = viewport.unproject([d.x, d.y]) //probably not needed
          d.pos = viewport.project([d.X, d.Y])
          d.x = d.pos[0]
          d.y = d.pos[1]
          return d.x
        })
        .attr('cy', d => {
          return d.y
        })
        /* .on('click', d => {
          accidentData.accidents.forEach(o => {
            o.theNeighbourhood = null
          })
          this.startingPoints.push(d.index)
          this.computeNeighbourhoodsAndDrawPolygons()
          this.zoomVisualizations()

          this.tooltip
            .style('opacity', 1.0)
            .html(d.Type)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px')
        }) */
        .on('mouseout', d => {
          //this.tooltip.hide)
          this.tooltip.style('opacity', 0)
        })
      /* .on('click', d => {
          console.log('dis dee', d)
        }) */
    },
    //updates all visualizations - svg nodes, aggregated visualizations
    updateVisualizations() {
      this.updateNodesOnMap()
      if (!this.isAggrVisInitialized) {
        this.doYouWantSomeWafflesCowboy = true
        this.drawAggregatedVis()
        this.isAggrVisInitialized = true
      } else {
        this.updateAggregatedVis()
      }
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
        .duration(2000)
        .ease(d3.easeLinear)

      const viewport = getViewport(this.$store.state.map)

      //aggrVis position
      this.nodesOnMap
        .attr('cx', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood) {
            console.log('imhere', d.neighbourhoodPosition)
            return d.centerShift[0] + d.neighbourhoodPosition[0]
          }
          /* if (d.ID === 60206182319) {
            console.log('d', d)
            console.log('af x', d.x)
            console.log('af c', d.centerShift)
          } */

          return d.x
        })
        .attr('cy', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood)
            return d.centerShift[1] + d.neighbourhoodPosition[1]
          return d.y
        })
      /* .attr('fill', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood)
            return 'red'
          return 'black'
        }) */
      /* .attr('r', d => {
          if (d.neighbourhoodPosition && d.centerShift && !d.inNeighbourhood)
            return 7
          return 5
        }) */

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
          let d = this.dataD3.accidents[n.indexInAccidentData]
          d.inNeighbourhood = false
          //d.neighbourhoodPosition = null
          Vue.set(d, 'centerShift', this.aggregatedData[i].centerInPx)
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
            Type: d.Type,
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
          //d.centerShift = this.aggregatedData[i].centerInPx
          Vue.set(d, 'centerShift', center)
          //Vue.set(d, 'argh', wtf)
          //console.log(d)
        })
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

      let allEmptyBarsCount = 0

      for (var i = 0; i < data_structure.bars.length; i++) {
        data_structure.bar_counts[i] = array
          .map(node => node.Type)
          .reduce(function(n, val) {
            return n + (val === data_structure.bars[i])
          }, 0)

        data_structure.bar_rows[i] = Math.ceil(
          data_structure.bar_counts[i] / GRID_COLS
        )

        if (data_structure.bar_counts[i] === 0) allEmptyBarsCount++
      }

      //console.log('rows', data_structure.bar_rows)
      //console.log('counts', data_structure.bar_counts)

      let arrayLen = array.length
      let CELL_SIZE = 10
      let GRID_COLS = Math.ceil(Math.max(...data_structure.bar_counts) / 10) //5
      if (GRID_COLS > 9) GRID_COLS = 9

      let GRID_ROWS = Math.ceil(array.length / GRID_COLS)
      //console.log('cols', GRID_COLS)
      //console.log('rows', GRID_ROWS)

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
      let CELL_SIZE = 10
      //let GRID_COLS = 5

      const data_structure = {
        typesOfData: [...this.listOfBarsTypeOfData],
        bars: [...this.listOfBarsTypeOfData],
        chart_cells: [],
        type_counts: []
      }

      let numberOfCells = 0

      for (var i = 0; i < data_structure.typesOfData.length; i++) {
        data_structure.type_counts[i] = array
          .map(node => node.Type)
          .reduce(function(n, val) {
            return n + (val === data_structure.typesOfData[i])
          }, 0)

        numberOfCells += data_structure.type_counts[i]
      }
      let arrayLen = array.length

      let GRID_COLS = Math.ceil(numberOfCells / 10) //5
      if (GRID_COLS > 20) GRID_COLS = 20
      let GRID_ROWS = Math.ceil(array.length / GRID_COLS)

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
            x: c * CELL_SIZE - (GRID_COLS * GRID_COLS) / 2,
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
      accidentData.accidents.forEach(o => {
        o.theNeighbourhood = null
      })
      //this.startingPoints = []
    },
    //recursive finding of neighbours and filling array of neighbourhood
    getNeighbours(obj) {
      let posiP2 = []
      this.addPointToNeighbourhood(obj.index)
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
      neighbourhood.min = viewport.project([minX, minY])
      neighbourhood.max = viewport.project([maxX, maxY])
    },
    //creating convex hull of neighbourhood points when neighbourhood is containing 3 or more accidents
    getConvexhull() {
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
          //return 'translate(' + d.max[0] + ', ' + d.centerInPx[1] + ')'
          return 'translate(' + d.centerInPx[0] + ', ' + d.centerInPx[1] + ')'
          //return 'translate(' + d.centerInPx[0] + ', ' + d.min[1] + ')'
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
            /* Vue.set(
              accidentData.accidents[d.indexInAccidentData],
              'centerShift',
              this.aggregatedData[i].centerInPx
            ) */
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

        // if (this.doYouWantSomeWafflesCowboy) {
        if (this.aggregatedVisSelected == 'Waffle chart') {
          this.initGridForWafflechart(
            this.aggregatedData[i].nodesInNeighbourhood
          )
        } else if (this.aggregatedVisSelected == 'Bar chart') {
          this.initGridForBarchart(this.aggregatedData[i].nodesInNeighbourhood)
        } else {
          console.log('you dont have any chart selected')
        }

        //console.log('please bro just go bro', this.grid_cells)

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
          console.log('d', d)
          //return 'translate(' + d.max[0] + ', ' + d.centerInPx[1] + ')'
          return 'translate(' + d.centerInPx[0] + ', ' + d.centerInPx[1] + ')'
          //return 'translate(' + d.centerInPx[0] + ', ' + d.min[1] + ')'
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

        //console.log('all', this.aggregatedData[i].nodesInNeighbourhood)

        /* currentAggregatedVis.exit().each(d => {
          let accidentNode = accidentData.accidents[d.indexInAccidentData]
          accidentNode.inNeighbourhood = false
          Vue.set(
            accidentNode,
            'centerShift',
            this.aggregatedData[i].centerInPx
          )
          //console.log('exit node', accidentNode)
        }) */
        /* .attr('r', 5)
          .attr('fill', d => {
            return 'red'
          }) */

        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .data(this.aggregatedData[i].nodesInNeighbourhood)
          .join('circle')
          //.update()
          .attr('class', 'circlesInAggregatedVis')
          .attr('r', 5)
          .attr('fill', d => {
            return colorScale(d.Type) //'black'
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
            console.log('dis dee', d)
          })

        if (this.aggregatedVisSelected == 'Waffle chart') {
          this.initGridForWafflechart(
            this.aggregatedData[i].nodesInNeighbourhood
          )
        } else if (this.aggregatedVisSelected == 'Bar chart') {
          this.initGridForBarchart(this.aggregatedData[i].nodesInNeighbourhood)
        }

        d3.select('#neighbourhood-' + this.aggregatedData[i].id)
          .selectAll('circle.circlesInAggregatedVis')
          .transition(t)
          .each(d => {
            let gridpoint

            if (this.aggregatedVisSelected == 'Waffle chart') {
              gridpoint = occupyNearestWafflechart(d, this.grid_cells[i])
            } else if (this.aggregatedVisSelected == 'Bar chart') {
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
              currentNodeInAccData.neighbourhoodPosition = [d.x, d.y]

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
