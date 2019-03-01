<template>
    <div class = 'accidentDetail' style = "width:500; height:500; top=300; left = 500;">
        <h1 class='title'>{{title}} </h1>
       <!--- <p> {{ body }} </p>-->
       <!-- <svg> -->
            <!--<circle :cx='cx' :cy='cy' r=50></circle>-->
        <!-- </svg> -->



    </div>
</template>

<script>
    import * as d3 from "d3";
    import store from "../store.js";

    export default {
        name: 'AccidentDetail',
        store,
        props:["title","body"], //musia byt v uvodzovkach
        mounted(){
            //this.loadData();
            this.init();
        },
        methods: {
            /* async loadData() {
                const data = await d3.csv("./data/Nehody2018.csv");
                this._data = data; ///...ale nemas data lol - ale aj tak sa budu importovat cez store
            }, */
            init(){
                this.render();
            },
            render(){

                let svg = d3
                    //.select(this.$store.state.map.getCanvasContainer) //chybalo state
                    .select(this.$el) //ale zrovna v tomto pripade chces pouzit "tento element" co je ten div z template... zatial to ber ako magiu, mozem vysvetlit nazivo :D ale je to kvoli tomu, ze AccidentDetail je vnutri Visualization
                    .append("svg") //this bit is important
                    .attr("class","accidentDetail") //asi je jedno ci je to id alebo class, ale potom sa to lisi v css, class ma ".accidentDetail", id myslim "#acc..."
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
