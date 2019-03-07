<template>
    
    <div class = 'accidentDetail' id="svgContainer" >
        <!--<circle cx=280 cy=70 r=60 style="fill:#5490b0cd"></circle>-->
        <svg width="390" height="73">
            <text class="text_style2" x="270" y="30" >{{parentdata[0].Datum }} </text>
            <text class="text_style2" x="270" y="50" >{{parentdata[0].Den }} </text>
            <image  v-bind="{'xlink:href':'adress[parentdata[0].DenNoc'}"  x="340" y="20" width="25" height="25"></image>
            <rect x="100" y="70" width="275" height="3" fill="#60bac6"/>
        </svg>
        <p class='title_style'> {{parentdata[0].DruhNehody}}  </p>
        <p class='text_style'> <em> Hlavní příčina: &ensp; </em>{{parentdata[0].HlavniPricina}} <br> 
                             <em> Zavineni: &ensp; </em>{{parentdata[0].Zavineni}}<br> 
                             <em> Stav povrchu: &ensp; </em>{{parentdata[0].StavPovrchu}} <br> 
                             <em> Počasí: &ensp; </em>{{parentdata[0].Pocasi}}<br> 
                             <em> Alkohol: &ensp; </em>{{parentdata[0].Alkohol}}</p>
        <svg width="390" height="73">
            <text class="text_style2" x="15" y="30" >{{"Usmrceno: "}} </text>
            <text class="text_style2" x="100" y="30" >{{parentdata[0].Usmrceno + " x"}} </text>
            <image  xlink:href="../assets/body.png"  x="117" y="12" width="22" height="22"></image>

            <text class="text_style2" x="15" y="53" >{{"Těžce zranení: "}} </text>
            <text class="text_style2" x="122" y="53" >{{parentdata[0].Tezce + " x"}} </text>
            <image  xlink:href="../assets/body.png"  x="139" y="36" width="22" height="22"></image>

            <text class="text_style2" x="180" y="53" >{{"Lehce zranení: "}} </text>
            <text class="text_style2" x="290" y="53" >{{parentdata[0].Lehce + " x"}} </text>
            <image  xlink:href="../assets/body.png"  x="307" y="36" width="22" height="22"></image>
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
        data(){
            return{
                adress:{
                    Noc : "../assets/Noc.png",
                    Den : "../assets/Den.png",
                }
            }
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
.date_style{
    color:rgb(0, 0, 0);
    font-family: 'Avenir';
    font-size: 15px;
    text-align: end;
    font-weight: 300;
    transform: translate(-10%, 0%)
}
.title_style{
    color:rgb(0, 0, 0);
    font-family: 'Avenir';
    font-size: 18px;
    font-weight: 300;
    transform: translate(6%, 0%)
}
.text_style{
    color : black;
    font-family: 'Avenir';
    font-size: 14px;
    transform: translate(+4%, 0%);
    font-weight: 300;
    line-height: 1.5;
    width: 380px;
    height: 105px;
    padding-bottom: 0;
    border-bottom: 0;
    
}
.text_style2{
    color:rgb(0, 0, 0);
    font-family: 'Avenir';
    font-size: 15px;
    font-weight: 300;
}
.line{
    fill:#60bac6
}
</style>
