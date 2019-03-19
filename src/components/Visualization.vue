<template>
  <div>
    <!--<div style="background-color:white; position:relative; visibility: hidden;"
    @click.left="calculateDistanceDeviation"
    @click.right.prevent="simulation.restart"
  >-->
    <svg></svg>
    <AccidentDetail v-for="(curr_accident, index) in detailAccidents" :key="index"  :accident="allData[curr_accident]" :index="index"></AccidentDetail>
    
  </div>
</template>

<script>
import * as d3 from 'd3'
import store from '../store.js'
import accidentData from '../data/nehody2018.js'
import AccidentDetail from './AccidentDetail.vue';
import WebMercatorViewport from 'viewport-mercator-project'

export default {
  name: 'Visualization',
  components: {
    AccidentDetail
  },
  data() {
    return {
      dataD3: [],
      graph: null,
      simulation: null,
      detailAccidents: [],
      allData: [],
      testovacie: [4, 3, 2, 1],
      points: [],
      hull: [],
      compute: 0,
      anchorPoint: null,
      reverse: false,
      title: null,
      svg: null,
      nodes: null,
      nodeRadius: 5,
      forceProperties: {
        collide: {
          enabled: true,
          strength: 0.7,
          iterations: 1,
          radius: 35
        },
        forceX: {
          enabled: true,
          strength: 0.7
        },
        forceY: {
          enabled: true,
          strength: 0.7
        }
      },
      curr_zoom: 0,
      distanceLimit: 3,
      recompute: false,
    }
  },
  store,
  mounted() {
    //this.loadData()
    //NEFUNGUJE NA ZMENY
    this.dataD3 = accidentData
    this.init()
    this.allData = accidentData.accidents
    count = 0;
    accidentData.accidents.forEach(
      o => {
        o.theNeighbourhood = null;
        o.index = count;
        count += 1;
      }
    )
    accidentData.accidents[1199].theNeighbourhood = accidentData.accidents[1199].OBJECTID
    // let projection = this.getProjection();
    // let posi = [];
    // accidentData.accidents.forEach(
    // //posi = projection([o.X,o.Y]),
    //   o => {
    //     posi = projection([o.X,o.Y]);
    //     if(posi[0] > 0 && posi[0]<window.innerWidth && posi[1]>0 && posi[1]<window.innerHeight){
    //       this.detailAccidents.push(o);
    //     }
    //   }
    // )
  },
  methods: {
    loadData() {
      /* Object.defineProperty(this.dataObject, 'nested', {
        configurable: false
      }) */
      /* Object.defineProperty(this.dataObject.actualData, 'nested', {
        configurable: false
      }) */
      d3.csv('./data/Nehody2018.csv')
        .then(data => {
          //data.forEach(o => Object.freeze(o))
          this.$store.dispatch('loadData', data)
          this.dataD3 = data
        })
        .catch(error => {
          console.error('Could not read the file.', error)
        })
      console.log('acc', accidentData.accidents)
      //this.dataD3 = Object.freeze(this.$store.state.dataset)
      //this.dataD3 = this.$store.state.dataset
      console.log('lel', this.dataD3)
      console.log('cmon', this.$store.state.datasetObject)
      //console.log('cmonnnn', this.$store.state.datasetObject.dataset)
      console.log(
        'cmonnnn',
        this.$store.state.datasetObject.dataset //.__ob__.value
      )
      console.log('array', this.$store.state.datasetObject.getData)
    },
    init() {
      this.render()
      this.listeners()
    },
    render() {
      //let projection = this.getProjection()
      const viewport = this.getViewport()
      const colorScale = d3.scaleOrdinal(d3.schemeDark2)

      let drag = d3
        .drag()
        .on('start', this.dragStarted)
        .on('drag', this.dragged)
        .on('end', this.dragEnded)

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
          if (d.theNeighbourhood==3442) {
              return 'blue'
          }else if(d.theNeighbourhood==2){
            return 'yellow'
          }
          return 'black' //return colorScale(d.DruhNehody)
        })
        .attr('cx', d => {
          d.pos = viewport.project([d.X, d.Y])
          //d.pos = projection([d.X, d.Y])
          d.x = d.pos[0]
          return d.pos[0]
        })
        .attr('cy', d => {
          d.y = d.pos[1]
          return d.pos[1]
        })

      //.call(drag)

      this.calculateDistanceDeviation()


      this.simulation = d3
        .forceSimulation()
        .nodes(this.dataD3.accidents)
        .force(
          'collide',
          d3
            .forceCollide()
            .radius(this.nodeRadius * 2)
            .strength(1)
            .iterations(1)
        )
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = viewport.project([d.X, d.Y])
              //d.pos = projection([d.X, d.Y])
              return d.pos[0]
            })
            .strength(0.7)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(0.7)
        )
        .on('tick', this.tick)

      //this.simulation.alpha(1).restart()
    },
    updateD3() {
      this.svg
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

      //let projection = this.getProjection()
      const viewport = this.getViewport()

      /* this.nodes
        .attr('cx', function(d) {
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        }) */
      /* .attr('cx', function(d) {
          d.pos = projection([d.X, d.Y])
          return d.pos[0]
        })
        .attr('cy', function(d) {
          return d.pos[1]
        }) */
      //this.calculateDistanceDeviation()

      this.simulation
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = viewport.project([d.X, d.Y])
              //d.pos = projection([d.X, d.Y])
              return d.pos[0]
            })
            .strength(0.7)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(0.7)
        )

      this.simulation.alpha(0.3).restart()
    },
    tick() {
      this.calculateDistanceDeviation()
      const viewport = this.getViewport()

      /* let zoom = this.$store.state.map.getZoom()
      if (Math.abs(zoom - this.curr_zoom) > 0.001) {
        // console.log(zoom);
        this.curr_zoom = zoom
      } */
      //let projection = this.getProjection()

      this.simulation
        .force(
          'forceX',
          d3
            .forceX(d => {
              d.pos = viewport.project([d.X, d.Y])
              //d.pos = projection([d.X, d.Y])
              return d.pos[0]
            })
            .strength(0.7)
        )
        .force(
          'forceY',
          d3
            .forceY(d => {
              return d.pos[1]
            })
            .strength(0.7)
        )

      const t = d3
        .transition()
        //.duration(0)
        .ease(d3.easeLinear)

      this.nodes
        .transition(t)
        //d3.selectAll('.nodes')
        .attr('cx', function(d) {
          return d.x
        })
        .attr('cy', function(d) {
          return d.y
        })
      /* .attr('cx', function(d) {
          d.pos = projection([d.X, d.Y])
          return d.pos[0]
        })
        .attr('cy', function(d) {
          return d.pos[1]
        }) */

      //this.simulation.alpha(1).restart()
      //console.log(this.simulation.alpha(), this.recompute);
      if(this.simulation.alpha() < 0.15 && this.recompute){
        let neighbourHall = [];
        this.points = [];
        this.hull = [];
        this.reverse = false;
        this.anchorPoint = null;
        this.getNeighbours(accidentData.accidents[1199],neighbourHall);
        this.recompute = false;
        console.log(this.points, this.anchorPoint, this.compute)
        //console.log(this.anchorPoint)
        this.hull = this.getHull();
        this.hull.forEach(o => {
          accidentData.accidents[o].theNeighbourhood = accidentData.accidents[this.anchorPoint].theNeighbourhood;
        })
        //console.log(this.hull)
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
    getProjection() {
      //let bbox = document.body.getBoundingClientRect()
      let center = this.$store.state.map.getCenter()
      let zoom = this.$store.state.map.getZoom()
      // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
      let scale = ((512 * 0.5) / Math.PI) * Math.pow(2, zoom)
      let d3projection = d3
        .geoMercator()
        .center([center.lng, center.lat])
        .translate(
          [
            window.innerWidth / 2,
            window.innerHeight / 2
          ] /* [bbox.width/2, bbox.height/2] */
        )
        .scale(scale)
      //.scale((1 << 21) / (2 * Math.PI)) //https://observablehq.com/@mbostock/d3-vector-tiles //
      //.precision(0);
      return d3projection
    },
    getViewport() {
      const center = this.$store.state.map.getCenter()
      const zoom = this.$store.state.map.getZoom()
      const pitch = this.$store.state.map.getPitch()
      const bearing = this.$store.state.map.getBearing()

      const viewport = new WebMercatorViewport({
        longitude: center.lng,
        latitude: center.lat,
        zoom: zoom,
        width: window.innerWidth,
        height: window.innerHeight,
        pitch: pitch,
        bearing: bearing
      })
      return viewport
    },
    worldToLngLat() {
      const projection = this.getProjection()
      console.log('49.2153206, 16.6001003')
      const A = projection([49.2153206, 16.6001003])
      console.log('world coords: ', A)
      const viewport = this.getViewport()
      const vpA = viewport.unproject(A)
      console.log('lonlat: ', vpA)
    },
    measureGeoDistance(lat1, lon1, lat2, lon2) {
      // generally used geo measurement function
      var R = 6378.137 // Radius of earth in KM
      var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180
      var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      var d = R * c
      return d * 1000 // meters
    },
    calculateDistanceDeviation() {
      const viewport = this.getViewport()
      this.dataD3.accidents.forEach(d => {
        const unshiftedCoords = [d.X, d.Y]
        const currentCoords = viewport.unproject(d.pos)

        const distanceInMeters = this.measureGeoDistance(
          unshiftedCoords[0],
          unshiftedCoords[1],
          currentCoords[0],
          currentCoords[1]
        )
        //console.log(distanceInMeters)
        d.tooFar = distanceInMeters > 0.000001 // currentDistance > 0.000000001 //this.distanceLimit
      })

      this.nodes.attr('fill', d => {
        if (d.theNeighbourhood == 3442) {
          //console.log('blue2')
          //console.log(d.tooFar)
          //getNeighbours(d);
          return 'blue'
        }else if(d.theNeighbourhood==2){
          return 'yellow'
        }
        return 'black'
      })
      //this.simulation.alpha(0.3).restart()
    },
    getNeighbours(obj,arr) {
      //accidentData.accidents[1199].theNeighbourhood = accidentData.accidents[1199].OBJECTID
      //console.log(obj.OBJECTID)
      let projection = this.getProjection()
      //let posiP1 = projection([obj.X, obj.Y])
      let posiP1 = [obj.x,obj.y]
      let posiP2 = []
      this.addPoint(obj.index);
      let r = 22 //TODO zistit ako dostat presne cisla a ako to menit podla zoomu
      //console.log("hello")
      accidentData.accidents.forEach(
        o => {
          if(o.theNeighbourhood==null && o != obj){
            //posiP2 = projection([o.X,o.Y]);
            posiP2 = [o.x,o.y];
            let inNeighbour = Math.sqrt(Math.pow((posiP1[0]-posiP2[0]),2) + Math.pow((posiP1[1]-posiP2[1]),2));
            if(inNeighbour <= r){
              o.theNeighbourhood = obj.theNeighbourhood;
              //console.log(o)
              this.getNeighbours(o,arr);
            }
          }
        })
        //console.log(this.anchorPoint)
        //console.log(this.points)
        //let hull = this.getHull();
        //console.log(hull)
        this.nodes.attr('fill', d => {
          if(d.theNeighbourhood == obj.theNeighbourhood){
            //console.log('blue1')
            return 'blue'
          }
          else if(d.theNeighbourhood==2){
            return 'yellow'
          }
                
          return 'black'
        })
    },
    addPoint(index){
      let point = accidentData.accidents[index]
      let anchorP = accidentData.accidents[this.anchorPoint]
      //console.log(this.anchorPoint === null)
      if(this.anchorPoint === null || point.Y < anchorP.Y || (point.Y === anchorP.Y && anchorP.X > point.X)){
        if(this.anchorPoint !== null){
          //this.points.push(index)
          this.points.push(this.anchorPoint);
        }
        this.anchorPoint = index;
      }else{
        this.points.push(index);
      }
    },

    findPolarAngle(anchor,p){
      //console.log("hhs")
      let ONE_RADIAN = 57.295779513082;
      let deltaX = null;
      let deltaY = null;
      //console.log("hhs")
      let point = accidentData.accidents[p];
      let anchorP = accidentData.accidents[anchor];
      deltaX = (point.X - anchorP.X);
      deltaY = (point.Y - anchorP.Y);
      //console.log(deltaX,deltaY)
      if (deltaX == 0 && deltaY == 0) {
          return 0;
      }

      let angle = Math.atan2(deltaY, deltaX) * ONE_RADIAN;

      if (this.reverse){
          if (angle <= 0) {
              angle += 360;
          }
      }else{
          if (angle >= 0) {
              angle += 360;
          }
      }

      return angle;
    },

    sortPoints(){
      //console.log("haf")
      //console.log(this.anchorPoint)
      //let something = this.iHaveNoIdeaWhyThatSortDontWork(204,274);
      return this.points.sort((a,b) => {
        let polarA = this.findPolarAngle(this.anchorPoint,a);
        let polarB = this.findPolarAngle(this.anchorPoint,b);
        //console.log(accidentData.accidents[a].theNeighbourhood)
        accidentData.accidents[a].theNeighbourhood = 2;
        accidentData.accidents[b].theNeighbourhood = 2;
        //console.log(this.anchorPoint,accidentData.accidents[this.anchorPoint].theNeighbourhood)
        //accidentData.accidents[this.anchorPoint].theNeighbourhood = 2;
        //console.log(polarA,polarB)
        if(polarA < polarB){
          return -1;
        }
        if(polarA > polarB){
          return 1;
        }
        return 0;
      })
    },

    checkPoints(p0,p1,p2){
      let difAngle;
      let cwAngle = this.findPolarAngle(p0, p1);
      let ccwAngle = this.findPolarAngle(p0, p2);

      if (cwAngle > ccwAngle) {
        difAngle = cwAngle - ccwAngle;
        return !(difAngle > 180);
      } else if (cwAngle < ccwAngle) {
        difAngle = ccwAngle - cwAngle;
        return (difAngle > 180);
      }
      return true;
    },
    checkIfPositive(points){
      //console.log(points)
      points.forEach(
        o => {
          //console.log(accidentData.accidents[o].X)
          if(!(accidentData.accidents[o].X < 0 && accidentData.accidents[o].Y < 0)){ //(point.x < 0 && point.y < 0)
            return false;
          }
        })
      return true;
    },

    getHull(){
      let hullPoints = []
      let pointis = []
      let pointsLength = null;
      //this.reverse = this.checkIfPositive(this.points);
      //console.log(this.reverse)
      //console.log(this.anchorPoint)
      pointis = this.sortPoints();
      //console.log(pointis)
      pointsLength = pointis.length;
      if (pointsLength < 3) {
        pointis.unshift(this.anchorPoint);
        return points;
      }
      hullPoints.push(pointis.shift(), pointis.shift());
      while (true) {
        let p0 = null;
        let p1 = null;
        let p2 = null;

        hullPoints.push(pointis.shift());
        p0 = hullPoints[hullPoints.length - 3];
        p1 = hullPoints[hullPoints.length - 2];
        p2 = hullPoints[hullPoints.length - 1];

        if (this.checkPoints(p0, p1, p2)) {
            hullPoints.splice(hullPoints.length - 2, 1);
        }

        if (pointis.length == 0) {
          if (pointsLength == hullPoints.length) {
            //check for duplicate anchorPoint edge-case, if not found, add the anchorpoint as the first item.
            let ap = this.anchorPoint;
            //remove any udefined elements in the hullPoints array.
            hullPoints = hullPoints.filter(function(p) { return !!p; });
            if (!hullPoints.some(function(p){
              return(accidentData.accidents[p].X == accidentData.accidents[ap].X && accidentData.accidents[p].Y == accidentData.accidents[ap].Y);
            })) {
              hullPoints.unshift(this.anchorPoint);
            }
            return hullPoints;
          }
          pointis = hullPoints;
          pointsLength = pointis.length;
          hullPoints = [];
          hullPoints.push(pointis.shift(), pointis.shift());
        }
      }
    },

    listeners() {
      //all events
      this.$root.$on('map-zoom', () => {
        this.updateD3()
        //this.worldToLngLat()
        
      })
      this.$root.$on('map-move', () => {
        this.updateD3()
        
      })
      //just end events
      this.$root.$on('map-zoomend', () => {
        //this.simulation.alphaTarget(0)
        this.calculateDistanceDeviation()

        const A = [49.2153206, 16.6001003]
        const B = [49.2141556, 16.6008667]

        const distanceInMeters = this.measureGeoDistance(A[0], A[1], B[0], B[1])
        //console.log('test distanceInMeters', distanceInMeters)
      })
      this.$root.$on('map-moveend', () => {
        accidentData.accidents.forEach(
          o => {
            o.theNeighbourhood = null;
          }
        )
        let neighbourHall = [];
        accidentData.accidents[1199].theNeighbourhood = accidentData.accidents[1199].OBJECTID;
        this.recompute = true;
        //this.getNeighbours(accidentData.accidents[1199]);
        this.calculateDistanceDeviation();
        
        let projection = this.getProjection();
        let posi = [];
        let counter = 0;
        // console.log(accidentData.accidents[1000])
        // accidentData.accidents[1000].theNeighbour = true;
        // console.log(accidentData.accidents[100].hasOwnProperty("theNeighbour"))
        if(this.$store.state.map.getZoom()>17.8){
          this.detailAccidents = [];
          accidentData.accidents.forEach( 
            o => {
              posi = projection([o.X,o.Y]);
              if(posi[0] > 0 && posi[0]<window.innerWidth && posi[1]>0 && posi[1]<window.innerHeight){
                this.detailAccidents.push(counter);
              }
              counter+=1;
            }
          )
          //console.log(this.detailAccidents);
          //console.log(this.allData);
        
        }
      })

      //this.$root.$on('map-viewreset', d => { console.log("viewreset"); this.updateD3(); })
    }
  },
  computed: {
    computedForceLayout: function() {
      if (this.simulation) {
        //const projection = this.getProjection()
        const viewport = this.getViewport()

        this.simulation
          .force(
            'forceX',
            d3
              .forceX(d => {
                d.pos = viewport.project([d.X, d.Y])
                //d.pos = projection([d.X, d.Y])
                // console.log(d.pos);
                return d.pos[0]
              })
              .strength(0.7)
          )
          .force(
            'forceY',
            d3
              .forceY(d => {
                return d.pos[1]
              })
              .strength(0.7)
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
        //const projection = this.getProjection()
        const viewport = this.getViewport()

        this.nodes
          .attr('r', this.nodeRadius)
          .attr('fill', d => {
            if (d.theNeighbourhood==3442) {
              return 'blue'
            }else if(d.theNeighbourhood==2){
              return 'yellow'
            }
            return 'black' //return colorScale(d.DruhNehody)
          })
          .attr('cx', d => {
            d.pos = viewport.project([d.X, d.Y])
            //d.pos = projection([d.X, d.Y])
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
.nodes {
  stroke: #fff;
  stroke-width: 2px;
}

#test_svg {
  position: relative;
}
</style>
