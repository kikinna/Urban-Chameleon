/** 
https://docs.opencv.org/master/d7/d1c/tutorial_js_watershed.html
*/

<template>
  <div id="gauss">
    <canvas id="paper-canvas" resize></canvas>
    <!-- <canvas id="opencv-canvas" resize> </canvas> -->
    <!-- <a class="button test" @click="glur" style="left: 10px;">Blur</a>
        <a class="button test" @click="thresholdUnit" style="left: 68px;">Unit Threshold</a>
        <a class="button test" @click="thresholdArea" style="left: 202px;">Area Threshold</a>
        <a class="button test" @click="blobDetection" style="left: 341px; ">Blob Detection</a>
        
        <a class="button is-dark" @click="neighbourhoodProcessingPipeline" style="left: 10px; top: 100px; position: absolute">IP Pipeline</a>

        <a class="button test" @click="clearCanvas" style="left: 150px; top: 500px ">Clear Canvas</a>
    <a class="button test" @click="drawNeighbourhoodAdepts" style="left: 10px; top: 500px ">Draw Accidents</a>-->
  </div>
</template>

<script>
import store from '../store.js'
import Paper from 'paper'
import cv from 'opencv.js'
import accidentData from '../../public/data/accidentsBrno2018.js'
import Visualization from './Visualization.vue'
import { EventBus } from '../helpers/EventBus.js'
import {
  getViewport,
  measureGeoDistance,
  drawPolygon
} from '../helpers/geoProjectionHelper.js'
import { findBlobs } from '../helpers/FindBlobs.js'

export default {
  name: 'NeighborhoodDetection',
  components: {
    Visualization
  },
  data() {
    return {
      paper: null,
      accident_dots: [],
      canvas: null,
      viewport: null,
      devicePixelRatio: 1,
      canvas_context: null,
      dot_intensity: 40 / 255,
      glur_module: null,
      threshold_module: null,
      unit_threshold: 25, // 67 is the highest possible threshold to detect small overlaps. Making this value smaller loosens the
      area_threshold: 30, // this value controlls how generous the final areas will be drawn. Smaller values means larger areas for the clusters
      gauss_radius: 7,
      canvas_height: 720,
      canvas_width: 710.4,
      canvas_aspect_ratio: 0.5625, // h/w
      boundingBoxesOfBlobs: [], //array with minimal and maximal points of x and y-axis od a blob
      accidentsOnScreen: [], 
      moved: true
    }
  },
  created() {
    // Try to load data here? Not. Somewhere else.
    // Paper.install(window)]
  },
  beforeMount() {
    this.listeners()
    // this.initCanvas();
  },
  mounted() {
    // this.listeners();
    this.initCanvas()
    // this.initOpenCVCanvas();
    this.glur_module = require('glur')
    this.threshold_module = require('image-filter-threshold')
    window.addEventListener('mousedown', this.mouseClicked)
    this.viewport = getViewport(this.$store.state.map)

    this.paper = Paper.setup(this.canvas)
  },
  methods: {
    initOpenCVCanvas() {
      let canvas = cv.imread('opencv-canvas')
      console.log(canvas)
      cv.circle(canvas, new cv.Point(50, 50), 100)
      // let circle = new cv.Circle(50, 50, 115)
    },
    drawNeighbourhoodAdepts() {
      this.clearCanvas()

      // get GPS location of screen bbox
      let screen_top_left = this.viewport.unproject([0, 0])
      let screen_bottom_right = this.viewport.unproject([
        window.innerWidth,
        window.innerHeight
      ])

      // draw data points into canvas
      let results = this.accidentsOnScreen.map(d => {
        let accident_screen_pos = this.viewport.project([d.X, d.Y])

        let accident_dot = new Paper.Path.Circle(
          new Paper.Point(
            (accident_screen_pos[0] / this.devicePixelRatio) *
              this.canvas_to_screen_ratio,
            (accident_screen_pos[1] / this.devicePixelRatio) *
              this.canvas_to_screen_ratio
          ),
          10 / this.devicePixelRatio
        ) // * this.canvas_to_screen_ratio)//8 / this.devicePixelRatio)
        accident_dot.fillColor = new Paper.Color(this.dot_intensity, 0, 0)
        accident_dot.blendMode = 'add'

        this.accident_dots.push(accident_dot.blendMode)
      })

      // call image processing pipeline 
      Promise.all(results).then(completed => {
        setTimeout(() => {
          // this.neighbourhoodProcessingPipeline()
          // this.imageProcessingInOpencv()
          this.testWatershed();
        }, 1)
      })
    },
    clearCanvas() {
      if (Paper.project.activeLayer.hasChildren()) {
        Paper.project.activeLayer.removeChildren()
      }
    },
    listeners() {
      this.$root.$on('map-zoomend', () => {
        this.viewport = getViewport(this.$store.state.map)
      })
      this.$root.$on('map-moveend', () => {
        this.viewport = getViewport(this.$store.state.map)
        this.moved = true
      })
      //event for comunication with visualization component
      EventBus.$on('start-neighbourhood-detection', data => {
        if (this.moved) {
          this.accidentsOnScreen = data
          this.drawNeighbourhoodAdepts()
          this.moved = false
        }
      })
    },
    initCanvas() {
      let w = window.innerWidth
      let h = window.innerHeight
      this.canvas_aspect_ratio = h / w
      this.canvas_to_screen_ratio = this.canvas_height / h

      this.canvas_width = this.canvas_height / this.canvas_aspect_ratio

      //console.log(this.canvas_to_screen_ratio)

      this.canvas = document.getElementById('paper-canvas')
      this.canvas.width = this.canvas_width
      this.canvas.height = this.canvas_height

      this.devicePixelRatio = window.devicePixelRatio || 1
      console.log(this.devicePixelRatio)
      this.canvas_context = this.canvas.getContext('2d')
    },
    mouseClicked(event) {
      var canvasColor = this.canvas_context.getImageData(
        event.clientX,
        event.clientY,
        1,
        1
      ).data // rgba e [0,255]
      var r = canvasColor[0]
      var g = canvasColor[1]
      var b = canvasColor[2]
      console.log(event.clientX, event.clientY, '-',  r, g, b)
    },


    imageProcessingInOpencv() {
      let src = cv.imread('paper-canvas')
      
      // convert image to grayscale (src -> gray)
      let gray = new cv.Mat()
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)

      // smooth the image using gaussian blur (gray -> blurred)
      let blurred = new cv.Mat()
      let ksize = new cv.Size(7,7)
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT)
      cv.imshow('paper-canvas', blurred)

      // get markers from the image = threshold (blurred -> marker)
      let markers = new cv.Mat()
      cv.threshold(blurred, markers, 15, 255, cv.THRESH_BINARY)
      cv.imshow('paper-canvas', markers)

      // All the other pixels in markers, whose relation to the outlined regions 
      // is not known and should be defined by the algorithm, should be set to 0's

      let labelled_markers = new cv.Mat()
      // let unknown = new cv.Mat()

      markers.convertTo(markers, cv.CV_8U, 1, 0)
      cv.connectedComponents(markers, labelled_markers)
      for (let i = 0; i < labelled_markers.rows; i++) {
          for (let j = 0; j < labelled_markers.cols; j++) {
              labelled_markers.intPtr(i, j)[0] = labelled_markers.ucharPtr(i, j)[0] + 1;
              // if (unknown.ucharPtr(i, j)[0] == 255) {
              //     labelled_markers.intPtr(i, j)[0] = 0;
              // }
          }
      }

      cv.imshow('paper-canvas', labelled_markers)

      cv.cvtColor(blurred, blurred, cv.COLOR_GRAY2RGB, 0)
      // cv.imshow('paper-canvas', blurred)
      // cv.watershed(blurred , marker)
      // cv.imshow('paper-canvas', blurred)

      let labels = new cv.Mat()
      let dst = new cv.Mat()
      let unknown = new cv.Mat()



      

      // cv.connectedComponents(marker, labels)
      // cv.imshow('paper-canvas', labels)
      // console.log(labels)
      // for (let i = 0; i < labels.rows; i++) {
      //   for (let j = 0; j < labels.cols; j++) {
      //       labels.intPtr(i, j)[0] = labels.ucharPtr(i, j)[0] + 1;
      //       if (unknown.ucharPtr(i, j)[0] == 255) {
      //           labels.intPtr(i, j)[0] = 0;
      //       }
      //   }
      // }
      // cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      // cv.watershed(src, labels)

      // for (let i = 0; i < labels.rows; i++) {
      //   for (let j = 0; j < labels.cols; j++) {
      //       if (labels.intPtr(i, j)[0] == -1) {
      //           blurred.ucharPtr(i, j)[0] = 255; // R
      //           blurred.ucharPtr(i, j)[1] = 0; // G
      //           blurred.ucharPtr(i, j)[2] = 0; // B
      //       }
      //   }
      // }
      // cv.imshow('paper-canvas', blurred)
    },

    testWatershed() {
      let src = cv.imread('paper-canvas');
      let dst = new cv.Mat();
      let gray = new cv.Mat();
      let opening = new cv.Mat();
      let coinsBg = new cv.Mat();
      let coinsFg = new cv.Mat();
      let distTrans = new cv.Mat();
      let unknown = new cv.Mat();
      let markers = new cv.Mat();

      let src_full = new cv.Mat();
      cv.threshold(src, src_full, 20, 255, cv.THRESH_BINARY)

      // -------- v1

      // convert image to grayscale (src -> gray)
      // let gray = new cv.Mat()
      // cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)

      // smooth the image using gaussian blur (gray -> blurred)
      // let blurred = new cv.Mat()
      // let ksize = new cv.Size(7,7)
      // cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT)
      // cv.imshow('paper-canvas', blurred)

      // let srcGray = new cv.Mat()
      // cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)
      // ------ v1

      // ------ v2
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      let blurred = new cv.Mat()
      let ksize = new cv.Size(7,7)
      let fg = new cv.Mat();
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT)

      cv.threshold(blurred, gray, 13, 255, cv.THRESH_BINARY)
      cv.threshold(blurred, fg, 20, 255, cv.THRESH_BINARY)
      // ------ v2


/*
      // gray and threshold image
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      // cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      cv.threshold(gray, gray, 13, 255, cv.THRESH_BINARY)
      // cv.threshold(blurred, gray, 10, 255, cv.THRESH_BINARY)
*/

      // get background
      // -> how does values (3 and 15 influence computational complexity and image processing)
      let M = cv.Mat.ones(5, 5, cv.CV_8U);
      // cv.erode(gray, gray, M);
      // cv.dilate(gray, opening, M);
      // cv.dilate(opening, coinsBg, M, new cv.Point(-1, -1), 3);
      cv.dilate(gray, coinsBg, M, new cv.Point(-1, -1), 15);


      // distance transform
      // // cv.distanceTransform(gray, distTrans, cv.DIST_L2, 5);
      // cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
      // cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);

      // cv.imshow('paper-canvas', fg);

      // get foreground
      // cv.threshold(gray, coinsFg, 0.7 * 1, 255, cv.THRESH_BINARY);
      // cv.threshold(distTrans, coinsFg, 0.7 * 1, 255, cv.THRESH_BINARY);
      // cv.imshow('paper-canvas', fg)
      fg.convertTo(fg, cv.CV_8U, 1, 0);
      // coinsFg.convertTo(coinsFg, cv.CV_8U, 1, 0);
      cv.subtract(coinsBg, fg, unknown);
      // cv.imshow('paper-canvas', unknown)


      // get connected components markers
      cv.connectedComponents(fg, markers);
      for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
          markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
              if (unknown.ucharPtr(i, j)[0] == 255) {
                markers.intPtr(i, j)[0] = 0;
              }
          }
      }
      // cv.imshow('paper-canvas', blurred);

      // cv.cvtColor(blurred, blurred, cv.COLOR_GRAY2RGB, 0);
      // cv.watershed(blurred, markers);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.cvtColor(src_full, src_full, cv.COLOR_RGBA2RGB, 0);
      cv.watershed(src_full, markers);
      // cv.cvtColor(gray, gray, cv.COLOR_RGBA2RGB, 0);
      // cv.watershed(gray, markers);
      // draw barriers
      for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
          if (markers.intPtr(i, j)[0] == -1) {
            src.ucharPtr(i, j)[0] = 0; // R
                  src.ucharPtr(i, j)[1] = 255; // G
                  src.ucharPtr(i, j)[2] = 0; // B
              }
          }
      }
      cv.imshow('paper-canvas', src);
    },



    neighbourhoodProcessingPipeline() {
      let that = this
      let imageData = this.canvas_context.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      )

      // --- 1. GAUSSIAN BLUR ---
      let glur1_res = this.glur_module(
        imageData.data,
        this.canvas.width,
        this.canvas.height,
        this.gauss_radius * this.canvas_to_screen_ratio
      )

      let glurred1_image = new ImageData(
        glur1_res,
        imageData.width,
        imageData.height
      )
      // this.canvas_context.putImageData(imageData, 0, 0)

      let unit_threshold_result
      // --- 2. UNIT THRESHOLD ---
      this.threshold_module(
        glurred1_image,
        { threshold: this.unit_threshold },
        4
      ).then(function(result) {
        // that.canvas_context.putImageData(result, 0, 0)
        unit_threshold_result = result

        // --- 3. GAUSSIAN BLUR ---
        let glur2_res = that.glur_module(
          unit_threshold_result.data,
          that.canvas.width,
          that.canvas.height,
          that.gauss_radius * that.canvas_to_screen_ratio
        )
        let glurred2_image = new ImageData(
          glur2_res,
          imageData.width,
          imageData.height
        )
        // that.canvas_context.putImageData(glurred2_image, 0, 0)

        // --- 4. AREA THRESHOLD ---
        that
          .threshold_module(
            glurred2_image,
            { threshold: that.area_threshold },
            4
          )
          .then(function(result) {
            // that.canvas_context.putImageData(result, 0, 0)

            // --- 5. BLOB DETECTION ---
            that.blobDetection(result)
            that.canvas_context.putImageData(
              that.$store.state.neighbourhoodImage,
              0,
              0
            )
            // --- 6. BOUNDING BOXES ---
            that.boundingBoxes()
            setTimeout(() => {
              let data = {
                boundingBoxes: that.boundingBoxesOfBlobs,
                scale: that.canvas_to_screen_ratio
              }
              EventBus.$emit('finished-neighbourhood-detection', data)
            }, 1)
          })
      })
    },

    glur(callbackList) {
      console.log('Glur')
      let imageData = this.canvas_context.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      )
      this.glur_module(
        imageData.data,
        this.canvas.width,
        this.canvas.height,
        this.gauss_radius
      )
      this.canvas_context.putImageData(imageData, 0, 0)
    },
    thresholdUnit(callbackList) {
      console.log('threshold UNIT')
      let imageData = this.canvas_context.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      )
      let that = this
      this.threshold_module(
        imageData,
        { threshold: this.unit_threshold },
        4
      ).then(function(result) {
        that.canvas_context.putImageData(result, 0, 0)
      })
    },
    thresholdArea(callback, ...theArgs) {
      console.log('threshold AREA')
      let imageData = this.canvas_context.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      )
      let that = this
      this.threshold_module(
        imageData,
        { threshold: this.area_threshold },
        4
      ).then(function(result) {
        that.canvas_context.putImageData(result, 0, 0)
      })
    },
    blobDetection(imageData) {
      // let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      // let that = this;
      let res = findBlobs(imageData)

      let row_width = res[0].length
      let col_height = res.length
      for (let r = 0; r < res.length; r++) {
        for (let c = 0; c < res[r].length; c++) {
          if (res[r][c] > 0) {
            let index = (r * row_width + c) * 4 + 1 // GREEN channel
            imageData.data[index] = res[r][c] // * 5
          }
        }
      }
      // this.canvas_context.putImageData(imageData, 0, 0)
      this.$store.commit('storeNeighbourhoodImage', imageData)
    },
    boundingBoxes() {
      let imageData = this.$store.state.neighbourhoodImage
      let boundingB = []
      let scale = this.canvas_to_screen_ratio
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x += 4) {
          let gIndex = (y * imageData.width + x) * 4 + 1
          let label = imageData.data[gIndex]
          if (label > 0) {
            if (boundingB[label] == undefined) {
              boundingB[label] = []
              for (let i = 0; i < 4; i++) {
                boundingB[label].push([
                  Math.floor(x / scale),
                  Math.floor(y / scale)
                ])
              }
            } else {
              if (boundingB[label][0][0] > x / scale) {
                boundingB[label][0] = [
                  Math.floor(x / scale),
                  Math.floor(y / scale)
                ]
              }
              if (boundingB[label][1][0] < x / scale) {
                boundingB[label][1] = [
                  Math.floor(x / scale),
                  Math.floor(y / scale)
                ]
              }
              if (boundingB[label][2][1] > y / scale) {
                boundingB[label][2] = [
                  Math.floor(x / scale),
                  Math.floor(y / scale)
                ]
              }
              if (boundingB[label][3][1] < y / scale) {
                boundingB[label][3] = [
                  Math.floor(x / scale),
                  Math.floor(y / scale)
                ]
              }
            }
          }
        }
      }
      //delete the ones that are undefined and ones that lies inside the other box
      for (let i = 1; i < boundingB.length; i++) {
        if (boundingB[i] !== undefined) {
          let first = boundingB[i]
          for (let j = 1; j < boundingB.length; j++) {
            if (boundingB[j] !== undefined && boundingB[i] !== boundingB[j]) {
              let second = boundingB[j]
              if (
                second[0][0] >= first[0][0] &&
                second[1][0] <= first[1][0] &&
                second[2][1] >= first[2][1] &&
                second[3][1] <= first[3][1]
              ) {
                boundingB.splice(j, 1)
              }
            }
          }
        } else {
          boundingB.splice(i, 1)
        }
      }
      this.boundingBoxesOfBlobs = [...boundingB]
    }
  }
}
</script>


<style scoped>
#paper-canvas {
  opacity: 0.65;
}

#gauss {
  position: absolute;
  z-index: +10;
  /* opacity: 0.7;  */
  /* width: 1903px;
  height: 960px; */
}

.test {
  position: absolute;
  top: 550px;
}
</style>