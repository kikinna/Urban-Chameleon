<template>
    <div class = 'accidentDetail' >
        <p class='title_style'> {{parentdata[0].Datum}} <br> {{parentdata[0].Den}} </p>
        <p class='text_style'> <em> Druh nehody: &ensp; </em>{{parentdata[0].DruhNehody}} <br> 
                             <em> Hlavní příčina: &ensp; </em>{{parentdata[0].HlavniPricina}} <br> 
                             <em> Zavineni: &ensp; </em>{{parentdata[0].Zavineni}}<br> 
                             <em> Stav povrchu: &ensp; </em>{{parentdata[0].StavPovrchu}} <br> 
                             <em> Počasí: &ensp; </em>{{parentdata[0].Pocasi}}<br> 
                             <em> Alkohol: &ensp; </em>{{parentdata[0].Alkohol}}</p>
       <svg style="width:390; height:160">
            <!--<circle :cx='cx' :cy='cy' r=50></circle>-->
            <circle cx=280 cy=70 r=60 style="fill:#5490b0cd"></circle>
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
    border: 1px solid rgb(222, 219, 219);
    background-color: #ebebebcd;
    border-radius: 30px;
    transform: translate(+240%, -50%);
    

}
.title_style{
    color:rgb(0, 0, 0);
    font-family: Helvetica;
    font-size: 20px;
    text-align: end;
    font-weight: 300;
    transform: translate(-10%, 0%)
}
.text_style{
    color : black;
    font-family: Helvetica;
    font-size: 14px;
    transform: translate(+4%, 0%);
    font-weight: 300;
    line-height: 1.5;
    
}
</style>
