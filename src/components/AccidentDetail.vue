<template>
    <div class = 'accidentDetail' >
        <h1 class='title_style'  >{{title}} </h1>
        <p class='text_style'> <strong>Druh nehody: </strong>{{parentdata[0].DruhNehody}} <br> 
                            <strong>Hlavní příčina: </strong>{{parentdata[0].HlavniPricina}} <br> 
                            <strong>Datum: </strong>{{parentdata[0].Datum}} </p>
       <svg style="width:370; height:160">
            <!--<circle :cx='cx' :cy='cy' r=50></circle>-->
            <circle cx=180 cy=70 r=60 style="fill:#5490b0cd"></circle>
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
    width: 800;
    border: 1px solid rgb(94, 94, 94);
    background-color: #d3d6d8cd;
    border-radius: 30px;
    transform: translate(+255%, -70%)
    

}
.title_style{
    color:rgb(0, 0, 0);
    font-family: Helvetica;
    font-size: 27px;
    text-align: center
}
.text_style{
    color : black;
    font-family: Helvetica;
    font-size: 14px;
    transform: translate(+4%, 0%)
}
</style>
