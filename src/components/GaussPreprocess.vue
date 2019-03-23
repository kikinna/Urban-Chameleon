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
                canvas: null
            }
        }, 
        created() {
            // Try to load data here? Not. Somewhere else.
            // Paper.install(window)
            
        },
        mounted() {
            const viewport = getViewport(this.$store.state.map);

            this.canvas = document.getElementById('paper-canvas')
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;

            this.paper = Paper.setup(this.canvas);
            
            // console.log(this.paper)
            console.log(accidentData)
            accidentData.accidents.map(d => {
                let pos = viewport.project([d.X, d.Y])
                // console.log(pos)
                this.accident_dots.push(new Paper.Path.Circle(new Paper.Point(pos[0], pos[1]), 8).fillColor = 'pink')
                // this.accident_dots.push(new Paper.Path.Circle(new Paper.Point(pos.x, pos.y), 8).fillColor = 'pink')

            })
            
            var myCircle = new Paper.Path.Circle(new Paper.Point(100, 70), 50);
            myCircle.fillColor = 'black';
            Paper.view.draw();

        }


    }
</script>


<style scoped>

#gauss {
  position: absolute;
  opacity: 0.7;  
}
</style>