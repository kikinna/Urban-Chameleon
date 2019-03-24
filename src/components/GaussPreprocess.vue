<template>
    <div id='gauss'>
        <canvas id='paper-canvas' resize width="1000px">

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
                canvas_context: null
            }
        }, 
        created() {
            // Try to load data here? Not. Somewhere else.
            // Paper.install(window)
            
        },
        mounted() {
            const viewport = getViewport(this.$store.state.map);

            this.canvas = document.getElementById('paper-canvas');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.devicePixelRatio = window.devicePixelRatio || 1;
            this.canvas_context = this.canvas.getContext("2d")
            console.log(this.canvas_context)

            let temp_pos;
            this.paper = Paper.setup(this.canvas);
            
            accidentData.accidents.map(d => {
                let pos = viewport.project([d.X, d.Y])
                temp_pos = pos;
                
                this.accident_dots.push(new Paper.Path.Circle(new Paper.Point(pos[0] / this.devicePixelRatio, pos[1] / this.devicePixelRatio), 8 / this.devicePixelRatio).fillColor = 'pink')
                // this.accident_dots.push(new Paper.Path.Circle(new Paper.Point(pos.x, pos.y), 8).fillColor = 'pink')

            })
            
            // var myCircle = new Paper.Path.Circle(new Paper.Point(100, 70), 50);
            // myCircle.fillColor = 'black';
            Paper.view.draw();

            
             // set color now
            // var canvasColor = this.context.getImageData(Math.random()*this.canvas.width, Math.random()*this.canvas.width, 1, 1).data; // rgba e [0,255]
            var canvasColor = this.canvas_context.getImageData(temp_pos[0] / this.devicePixelRatio, temp_pos[0] / this.devicePixelRatio, 1, 1).data; // rgba e [0,255]
            var r = canvasColor[0];
            var g = canvasColor[1];
            var b = canvasColor[2];
            console.log(r, g, b)

        }


    }
</script>


<style scoped>

#gauss {
  position: absolute;
  opacity: 0.7;  
}
</style>