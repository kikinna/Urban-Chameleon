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
  findPolarAngle,
  sortPoints,
  checkPoints,
  getHull
} from '../helpers/neighbourhoodCountingHelper.js'

import {
  getViewport,
  measureGeoDistance,
  drawPolygon
} from '../helpers/geoProjectionHelper.js'
import { occupyNearest } from '../helpers/mathHelper.js'

export default {
  name: 'Visualization',
  components: {
    AccidentDetail
  },
  data() {
    return {
      dataD3: [],
      simulation: null,
      detailAccidents: [], //indices for detail card of accident
      allData: [],
      //testovacie: [4, 3, 2, 1],
      points: [], //indices of points for countinginprogress neighbourhood
      neighbour: [], //Array of neighbourhoods objects - hull:indices of convex hull points, hood:indices of all points, anchorpoint
      startingPoints: [], //points for visualization of neighbourhoods - just prototype
      compute: 0,
      anchorPoint: null, //anchor point of counting in progress neighbourhood
      reverse: false, //helper for angles in convexhull counting
      title: null,
      aggregatedData: [],
      aggregatedNodes: null,
      dataD3: [], //accident data
      cells: [], // barchart grid positions //TODO: temporary
      simulation: null, // accident data force simulation
      svg: null,
      nodes: null, //accident nodes
      nodeRadius: 5,
      recompute: false,
      distanceLimit: 0.000001 //used in calculateDistanceDeviation to compare with the calculated distance between nodes
    }
  },
  store,
  mounted() {
    //this.loadData()
    //NEFUNGUJE NA ZMENY
    this.dataD3 = accidentData
    this.render()
    this.listeners()

    //megi
    this.allData = accidentData.accidents
    let count = 0
    accidentData.accidents.forEach(o => {
      o.theNeighbourhood = null
      o.index = count
      count += 1
    })
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
          } else if (d.theNeighbourhood == 2) {
            return 'black'
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
      if (this.simulation.alpha() < 0.15 && this.recompute) {
        this.makePolygons()
      }
    },
    makePolygons() {
      this.recompute = false
      this.reverse = false
      this.anchorPoint = null
      this.points = []
      this.neighbour = []
      this.startingPoints.forEach(o => {
        this.getNeighbours(accidentData.accidents[o])
        if (this.points.length > 1) {
          let hull = this.getHull(this.anchorPoint)
          let neigh = {
            hull: hull,
            hood: this.points,
            anchorPoint: this.anchorPoint
          }
          this.neighbour.push(neigh)
        }
        this.points = []
        this.anchorPoint = null
      })
      console.log(this.neighbour)

      this.svg
        .selectAll('polygon')
        .data(this.neighbour)
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

      this.aggregatedData.forEach(d => {
        let gridpoint = occupyNearest(d, this.cells) //TODO: this.cells should change
        if (gridpoint) {
          d.fx = gridpoint.x + shift[0]
          d.fy = gridpoint.y + shift[1]
        }
      })

      this.initGrid(this.aggregatedData.length)

      this.aggregatedNodes
        /* .each(d => {
          let gridpoint = occupyNearest(d, this.cells) //TODO: this.cells should change
          if (gridpoint) {
            // ensures smooth movement towards final positoin
            //d.x += (gridpoint.x - d.x) * 0.05
            //d.y += (gridpoint.y - d.y) * 0.05

            // jumps directly into final position
            d.fx = gridpoint.x + shift[0]
            d.fy = gridpoint.y + shift[1]
          }
        }) */
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
        //console.log(distanceInMeters)
        d.tooFar = distanceInMeters > 0.000001 // currentDistance > 0.000000001 //this.distanceLimit
      })

      this.nodes.attr('fill', d => {
        if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
          return '#487284d2'
        } else if (d.theNeighbourhood == 2) {
          return 'black'
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
      this.aggregatedData = []

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
            fx: null,
            fy: null,
            DruhNehody: d.DruhNehody,
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
    },
    getNeighbours(obj) {
      let posiP1 = [obj.x, obj.y]
      let posiP2 = []
      this.addPoint(obj.index)
      let r = 22 //TODO zistit ako dostat presne cisla a ako to menit podla zoomu

      //looking through all points in data if its in close neighbourhood, if yes counting close neighbourhood also for them...
      accidentData.accidents.forEach(o => {
        if (o.theNeighbourhood == null && o != obj) {
          posiP2 = [o.x, o.y]
          let inNeighbour = Math.sqrt(
            Math.pow(posiP1[0] - posiP2[0], 2) +
              Math.pow(posiP1[1] - posiP2[1], 2)
          )
          if (inNeighbour <= r) {
            o.theNeighbourhood = obj.theNeighbourhood
            this.getNeighbours(o)
          }
        }
      })
      this.nodes.attr('fill', d => {
        if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
          return '#487284d2'
        } else if (d.theNeighbourhood == 2) {
          return 'black'
        }

        return 'black'
      })
    },
    addPoint(index) {
      let point = accidentData.accidents[index]
      let anchorP = accidentData.accidents[this.anchorPoint]
      //check if this point will be anchor point
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
      let ONE_RADIAN = 57.295779513082
      let deltaX = null
      let deltaY = null

      let point = accidentData.accidents[p]
      let anchorP = accidentData.accidents[anchor]
      deltaX = point.X - anchorP.X
      deltaY = point.Y - anchorP.Y

      if (deltaX == 0 && deltaY == 0) {
        return 0
      }

      let angle = Math.atan2(deltaY, deltaX) * ONE_RADIAN

      if (this.reverse) {
        //this part is not working yet and im not sure if its needed
        if (angle <= 0) {
          angle += 360
        }
      } else {
        if (angle >= 0) {
          angle += 360
        }
      }
      return angle
    },

    //found some implementations where something like this was used, but was not needed now, but maybe will be ¯\_(ツ)_/¯
    // checkIfPositive(points){
    //   //console.log(points)
    //   points.forEach(
    //     o => {
    //       //console.log(accidentData.accidents[o].X)
    //       if(!(accidentData.accidents[o].X < 0 && accidentData.accidents[o].Y < 0)){ //(point.x < 0 && point.y < 0)
    //         return false;
    //       }
    //     })
    //   return true;
    // },

    getHull() {
      let hullPoints = []
      let pointis = []
      let pointsLength = null

      pointis = sortPoints(this.anchorPoint, this.points, this)
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
      })
      this.$root.$on('map-move', () => {
        this.updateVisualizations()
      })
      //just end events
      this.$root.$on('map-zoomend', () => {
        this.calculateDistanceDeviation()
      })
      this.$root.$on('map-moveend', () => {
        this.removeNeighbours()
        this.createNeighbours()

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
        this.drawSingleAggregatedVis()
        //this.initAggregatedVis()
        //this.overallUpdate()
      })

      //this.aggregatedData.push(nodesInNeighbourhood)
    },
    updateVisualizations() {
      this.updateD3()
      this.updateAggregatedVis()
    },
    //Prepareing things for new neighbourhood computing
    removeNeighbours() {
      d3.selectAll('polygon').remove()
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
      let counter = 0
      accidentData.accidents.forEach(o => {
        let posi = [o.x, o.y]
        if (
          posi[0] > 0 &&
          posi[0] < window.innerWidth &&
          posi[1] > 0 &&
          posi[1] < window.innerHeight
        ) {
          this.detailAccidents.push(counter)
        }
        counter += 1
      })
    },
    drawSingleAggregatedVis() {
      //hardcoded neighbourhood
      const latlon1 = [16.59512715090524, 49.20013082305056]
      const latlon3 = [16.605566189434686, 49.19358091860195]
      const viewport = getViewport(this.$store.state.map)
      const shiftX = (latlon1[0] + latlon3[0]) / 2
      const shiftY = (latlon1[1] + latlon3[1]) / 2
      const shift = viewport.project([shiftX, shiftY])
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      this.initNeighbourData()

      /* this.nodes.attr('class', d => {
        if (d.area) {
          return 'neighbourhood'
        } else {
          return 'nodes'
        }
      }) */

      this.initGrid(this.aggregatedData.length)

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
        .attr('fill', d => {
          return colorScale(d.DruhNehody)
        })

      this.aggregatedData.forEach(d => {
        let gridpoint = occupyNearest(d, this.cells) //TODO: this.cells should change
        if (gridpoint) {
          d.fx = gridpoint.x + shift[0]
          d.fy = gridpoint.y + shift[1]
        }
      })

      this.aggregatedNodes
        .attr('cx', d => {
          if (!d.fx || !d.fy) {
            console.log(d, 'why')
          }
          d.forceGPS = viewport.unproject([d.fx, d.fy])
          d.pos = viewport.project(d.forceGPS)
          //d.fx = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          //d.fy = d.pos[1]
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
            if (d.theNeighbourhood == 3442 || d.theNeighbourhood == 2111) {
              return '#487284d2'
            } else if (d.theNeighbourhood == 2) {
              return 'black'
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

.nodes {
  stroke: rgb(255, 255, 255);
  stroke-width: 2px;
}

#test_svg {
  position: relative;
}
</style>
