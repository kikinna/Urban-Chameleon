<template>
    <div id='gauss'>
        <canvas id='paper-canvas' resize>

        </canvas>
        <a class="button test" @click="glur" style="left: 142px;">Blur</a>
        <a class="button" @click="theWholeProcessing" style="left: 142px; top: 100px; position: absolute">The whole</a>
        <a class="button test" @click="thresholdUnit" style="left: 200px;">Unit Threshold</a>
        <a class="button test" @click="thresholdArea" style="left: 350px;">Area Threshold</a>
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

    export default {
        data() {
            return {
                paper: null,
                accident_dots: [],
                canvas: null,
                devicePixelRatio: 1,
                canvas_context: null,
                dot_intensity: 100/255,
                glur_module: null,
                threshold_module: null,
                unit_threshold: 51,
                area_threshold: 41,
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
                
                let accident_dot = new Paper.Path.Circle(new Paper.Point(accident_screen_pos[0] / this.devicePixelRatio, accident_screen_pos[1] / this.devicePixelRatio), 8 / this.devicePixelRatio)
                accident_dot.fillColor = new Paper.Color(this.dot_intensity, 0, 0)
                accident_dot.blendMode = 'add'

                this.accident_dots.push(accident_dot.blendMode)
            })
            
            var myCircle = new Paper.Path.Circle(new Paper.Point(51, 0), 50);
            myCircle.fillColor = new Paper.Color(0.5, 0, 0);
            Paper.view.draw();


        },
        methods: {
            mouseMoved(event) {
                var canvasColor = this.canvas_context.getImageData(event.clientX, event.clientY, 1, 1).data; // rgba e [0,255]
                var r = canvasColor[0];
                var g = canvasColor[1];
                var b = canvasColor[2];
                console.log(event.clientX, event.clientY, '-',  r, g, b)

                // this.glur();
                // this.threshold();
            },
            glur() {
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                console.log('before')
                console.log(imageData)
                this.glur_module(imageData.data, this.canvas.width, this.canvas.height, this.gauss_radius)
                // console.log(res)
                
                console.log('after')
                console.log(imageData)
                this.canvas_context.putImageData(imageData, 0, 0)
                // console.log(imageData)
            },
            thresholdUnit() {
                // console.log(this.threshold_module)
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                let that = this;
                this.threshold_module(imageData, { threshold : this.unit_threshold}, 4)
                    .then(function(result) {
                        // console.log(result)
                        that.canvas_context.putImageData(result, 0, 0)
                    })
                    
            },
            thresholdArea() {
                // console.log(this.threshold_module)
                let imageData = this.canvas_context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                let that = this;
                this.threshold_module(imageData, { threshold : this.area_threshold}, 4)
                    .then(function(result) {
                        // console.log(result)
                        that.canvas_context.putImageData(result, 0, 0)
                    })
                    
            },
            theWholeProcessing() {
                this.glur()
                this.thresholdUnit()
                this.glur()
                this.thresholdArea()
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