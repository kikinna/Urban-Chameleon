<template>
    <div id='gauss'>
        <canvas id='paper-canvas' resize>

        </canvas>
        <a class="button test" @click="glur" style="left: 142px;">Blur</a>
        <a class="button test" @click="thresholdUnit" style="left: 200px;">Unit Threshold</a>
        <a class="button test" @click="thresholdArea" style="left: 350px;">Area Threshold</a>

        <a class="button" @click="theWholeProcessing" style="left: 142px; top: 100px; position: absolute">The whole</a>
        <a class="button" @click="blobDetection" style="left: 242px; top: 100px; position: absolute">Blob Detection</a>
        
        <a class="button" @click="test" style="left: 242px; top: 150px; position: absolute">Test</a>
    </div>
</template>

<script>
import store from '../store.js'
import Paper from 'paper'
import accidentData from '../data/nehody2018.js'
import {
  getViewport,
  measureGeoDistance,
  drawPolygon
} from '../helpers/geoProjectionHelper.js'
import { findBlobs } from '../helpers/FindBlobs.js'

    export default {
        data() {
            return {
                paper: null,
                accident_dots: [],
                canvas: null,
                devicePixelRatio: 1,
                canvas_context: null,
                dot_intensity: 40/255,
                glur_module: null,
                threshold_module: null,
                unit_threshold: 17, // 67 is the highest possible threshold to detect small overlaps. Making this value smaller loosens the 
                area_threshold: 31, // this value controlls how generous the final areas will be drawn. Smaller values means larger areas for the clusters
                gauss_radius: 9
            }
        }, 
        created() {
            // Try to load data here? Not. Somewhere else.
            // Paper.install(window)
            
        },
        mounted() {
            this.glur_module = require('glur')
            this.threshold_module = require('image-filter-threshold')
            console.log(findBlobs)

            // console.log(this.threshold_module)



            window.addEventListener('mousedown', this.mouseMoved)
            const viewport = getViewport(this.$store.state.map);

            this.canvas = document.getElementById('paper-canvas');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            // this.canvas.width = 1903;
            // this.canvas.height = 969;
            this.devicePixelRatio = window.devicePixelRatio || 1;
            this.canvas_context = this.canvas.getContext("2d")
            console.log(this.canvas_context)

            this.paper = Paper.setup(this.canvas);
            
            accidentData.accidents.map(d => {
                let accident_screen_pos = viewport.project([d.X, d.Y])
                
                let accident_dot = new Paper.Path.Circle(new Paper.Point(accident_screen_pos[0] / this.devicePixelRatio, accident_screen_pos[1] / this.devicePixelRatio), 5)//8 / this.devicePixelRatio)
                accident_dot.fillColor = new Paper.Color(this.dot_intensity, 0, 0)
                accident_dot.blendMode = 'add'

                this.accident_dots.push(accident_dot.blendMode)
            })
            
            // var myCircle = new Paper.Path.Circle(new Paper.Point(51, 0), 50);
            // myCircle.fillColor = new Paper.Color(0.5, 0, 0);
            // Paper.view.draw();


        },
        methods: {
            mouseMoved(event) {
                var canvasColor = this.canvas_context.getImageData(event.clientX, event.clientY, 1, 1).data; // rgba e [0,255]
                var r = canvasColor[0];
                var g = canvasColor[1];
                var b = canvasColor[2];
                console.log(event.clientX, event.clientY, '-',  r, g, b)
            },
            test() {
                console.log('Glur')
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.glur_module(imageData.data, this.canvas.width, this.canvas.height, this.gauss_radius)
                this.canvas_context.putImageData(imageData, 0, 0)
                console.log('glur done')

                console.log('threshold UNIT')
                // imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                let that = this;
                this.threshold_module(imageData, { threshold : this.unit_threshold}, 4)
                    .then(function(result) {
                        // imageData = result;
                        // that.canvas_context.putImageData(imageData, 0, 0)
                        that.canvas_context.putImageData(result, 0, 0)

                    })
                // console.log(res)

                console.log('Glur')
                imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.glur_module(imageData.data, this.canvas.width, this.canvas.height, this.gauss_radius)
                this.canvas_context.putImageData(imageData, 0, 0)

                console.log('threshold AREA')
                 imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                // let that = this;
                this.threshold_module(imageData, { threshold : this.area_threshold}, 4)
                    .then(function(result) {
                        that.canvas_context.putImageData(result, 0, 0)
                    })
            },
            async glur(callbackList) {
                console.log('Glur')
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.glur_module(imageData.data, this.canvas.width, this.canvas.height, this.gauss_radius)
                this.canvas_context.putImageData(imageData, 0, 0)
                // if (callbackList.length > 0) {
                //     let newCallback = callbackList.shift();
                //     newCallback(callbackList)
                // }
            },
            async thresholdUnit(callbackList) {
                console.log('threshold UNIT')
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                let that = this;
                this.threshold_module(imageData, { threshold : this.unit_threshold}, 4)
                    .then(function(result) {
                        that.canvas_context.putImageData(result, 0, 0)
                    })
                // if (callbackList.length > 0) {
                //     let newCallback = callbackList.shift();
                //     newCallback(callbackList)
                // }
                
            },
            async thresholdArea(callback, ...theArgs) {
                console.log('threshold AREA')
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                let that = this;
                this.threshold_module(imageData, { threshold : this.area_threshold}, 4)
                    .then(function(result) {
                        that.canvas_context.putImageData(result, 0, 0)
                    })
                // if (callback.length > 0) {
                //     console.log(callback, theArgs)
                //     callback(theArgs.shift(), theArgs)
                // }
                    
            },
            blobDetection() {
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                // let that = this;
                let res = findBlobs(imageData)

                let row_width = res[0].length;
                let col_height = res.length;
                for (let r = 0; r < res.length; r++) {
                    for (let c = 0; c < res[r].length; c++) {
                        if (res[r][c] > 0) {
                            let index = ((r * row_width + c) * 4) + 1 // GREEN channel
                            imageData.data[index] = res[r][c] * 10
                        }
                    }
                }
                this.canvas_context.putImageData(imageData, 0, 0)
            },
            theWholeProcessing() {
                // this.glur();
                // this.glur([this.thresholdUnit, this.glur, this.thresholdArea])
                // let that = this;
                let that = this;
                // this.glur().then(function(value) { console.log(value)})
                this.glur()
                    .then(that.thresholdUnit()
                        .then(that.glur()
                            .then(that.thresholdArea())
                        ))
                // this.glur()
                //     .then(d => { that.thresholdUnit()
                //         .then(e => { that.glur() 
                //             .then(f => { that.thresholdArea() 
                //                 .then(g => {that.glur()})
                //             })
                //         })
                //     })
                // // this.glur()
                // this.thresholdUnit()
                // this.glur()
                // this.thresholdArea()
                    //.then(function(result) {
                    //    this.thresholdUnit()
                    // })
                    //.then(this.thresholdUnit())
                    //.then(this.glur())
                    //.then(this.thresholdArea())
                    
                    
    

            
            }
        }


    }
</script>


<style scoped>

#gauss {
  position: absolute;
  z-index: 0;
  /* opacity: 0.7;  */
  /* width: 1903px;
  height: 960px; */
}

.test{
    position: absolute;
    top: 50px;
}
</style>