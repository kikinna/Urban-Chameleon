<template>
    <div id='gauss'>
        <canvas id='paper-canvas' resize>

        </canvas>
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
                dot_intensity: 20/255
            }
        }, 
        created() {
            // Try to load data here? Not. Somewhere else.
            // Paper.install(window)
            
        },
        mounted() {
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
            
            // var myCircle = new Paper.Path.Circle(new Paper.Point(100, 70), 50);
            // myCircle.fillColor = 'black';
            Paper.view.draw();


        },
        methods: {
            mouseMoved(event) {
                var canvasColor = this.canvas_context.getImageData(event.clientX, event.clientY, 1, 1).data; // rgba e [0,255]
                var r = canvasColor[0];
                var g = canvasColor[1];
                var b = canvasColor[2];
                console.log(event.clientX, event.clientY, '-',  r, g, b)
            }
        }


    }
</script>


<style scoped>

#gauss {
  position: absolute;
  /* opacity: 0.7;  */
  /* width: 1903px;
  height: 960px; */
}
</style>