<template>
    <div class = 'accidentDetail' >
        <h1 class='title'>{{title}} </h1>
        <p>{{parentdata[0].DruhNehody}}  </p>
       <svg style="width:250; height:130">
            <!--<circle :cx='cx' :cy='cy' r=50></circle>-->
            <circle cx=130 cy=50 r=50></circle>
        </svg> 



    </div>
</template>

<script>
    import * as d3 from "d3";
    import store from "../store.js";

    export default {
        name: 'AccidentDetail',
        store,
        props:{
            title: String,
            parentdata: Object,
        }, 
        mounted(){
            //this.loadData();
            this.init();
        },
        methods: {
            /* async loadData() {
                const data = await d3.csv("./data/Nehody2018.csv");
                this._data = data; 
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
                    .attr("width", 250)
                    .attr("height", 350)
                    .attr("min-x",100)
                    .attr("min-y",100)

            },
        }
    }
   
</script>

<style scoped>
.accidentDetail {
    position: absolute;
    width: 500;
    border: 1px solid black;
    background-color: #d8d3d3cd;
    border-radius: 30px;

}
</style>
