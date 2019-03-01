<template>
    <div class = 'accidentDetail' align="left" style = "width:500; height:500" top="300" left = "500">
        <h1 class='title'>{{title}} </h1>
       <!--- <p> {{ body }} </p>-->
       <svg>
            <!--<circle :cx='cx' :cy='cy' r=50></circle>-->
        </svg>



    </div>
</template>

<script>
    import * as d3 from "d3";
    import store from "../store.js";

    export default {
        name: 'AccidentDetail',
        props:[title,body],
        data() {
            return {
                title : "Accident Detail",
                body : ""
            }
        },
        store,
        mounted(){
            this.loadData();
            this.init();
        },
        methods: {
            async loadData() {
                const data = await d3.csv("./data/Nehody2018.csv");
                this._data = data;
            },
            init(){
                this.render();
            },
            render(){
                let map = this.$store.state.map;
                let container = map.getCanvasContainer();

                let svg = d3
                    .select(this.$store.map.getCanvasContainer)
                    .attr("id","accidentDetail")
                    .attr("width", window.innerWidth)
                    .attr("height", window.innerHeight);

            },
        }
    }
   
</script>

<style scoped>
.accidentDetail {
    position: absolute;
    top:600;
    left:900;
    border: 1px solid black;
    background-color: #eeeeeeaa;
    border-radius: 30px;

}
</style>
