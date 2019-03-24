
<template>
    <div v-if="this.$store.state.map.getZoom() > 18.5" class='accidentDetail' v-bind:style="{left: left_top[0] + 'px', top: left_top[1] + 'px'}">
        <!-- 412x294 -->
            <!-- <circle cx=280 cy=70 r=60 style="fill:#5490b0cd"></circle> -->
            <circle cx=280 cy=70 r=60 v-bind:style="{fill:color}"></circle>
            <svg  width="325" height="65">
                <circle cx=32 cy=28 r=5 v-bind:style="{fill:color}"></circle>
                <text class="text_style2" x="225" y="27" >{{accident.Datum }} </text>
                <text class="text_style2" x="225" y="47" >{{accident.Den }} </text>
                <image v-if="accident.DenNoc == 'Den'" xlink:href= "../assets/Den.png"  x="290" y="20" width="25" height="25"></image>
                <image v-if="accident.DenNoc == 'Noc'" xlink:href= "../assets/Noc.png"  x="290" y="20" width="25" height="25"></image>
                <rect x="100" y="60" width="224" height="3" v-bind:style="{fill:color}"/>
            </svg>
            <p class='title_style'> {{accident.DruhNehody}} </p>
            <p class='text_style'>  Hlavní příčina: &ensp; <em>{{accident.HlavniPricina}} </em> <br> 
                                 Zavineni: &ensp; <em>{{accident.Zavineni}} </em><br> 
                                 Stav povrchu: &ensp; <em>{{accident.StavPovrchu}} </em> <br> 
                                 Počasí: &ensp; <em>{{accident.Pocasi}}</em> <br> 
                                Alkohol: &ensp; <em>{{accident.Alkohol}}</em> </p>
            <svg width="325" height="60">
                <text class="text_style2" x="18" y="30" >{{"Usmrceno: "}} </text>
                <text class="text_style2" x="83" y="30" >{{accident.Usmrceno + " x"}} </text>
                <image  xlink:href="../assets/body.png"  x="98" y="17" width="18" height="18"></image>

                <text class="text_style2" x="18" y="48" >{{"Těžce zranení: "}} </text>
                <text class="text_style2" x="105" y="48" >{{accident.Tezce + " x"}} </text>
                <image  xlink:href="../assets/body.png"  x="120" y="35" width="18" height="18"></image>

                <text class="text_style2" x="185" y="48" >{{"Lehce zranení: "}} </text>
                <text class="text_style2" x="273" y="48" >{{accident.Lehce + " x"}} </text>
                <image  xlink:href="../assets/body.png"  x="288" y="35" width="18" height="18"></image>
            </svg>
    </div>
</template>

<script>
    import * as d3 from "d3";
    import store from "../store.js";
    import { getViewport } from '../helpers/geoProjectionHelper.js'

    export default {
        name: 'AccidentDetail',
        store,
        props:{
            accident: Object,
            index: Number,
        }, 
        data(){
            return{
                adress:{
                    Noc : "../assets/Noc.png",
                    Den : "../assets/Den.png",
                },
                transform:{
                    k: 1,
                    x: accident.X,
                    y:accident.Y
                }
            }
        },
        mounted(){
            this.init();
            this.num = Math.random()*50;
        },
        methods: {
            init(){
                this.render();
            },
            render(){
            },
        },
        computed: {
            left_top: function() {
                let viewport = getViewport(this.$store.state.map);
                return viewport.project([this.accident.X, this.accident.Y])                
            },
            color: function() {
                return this.accident.color
            }
            

        }

    }
   
</script>

<style scoped>
.accidentDetail {
    position: absolute;
    width: 600;
    border: 1px solid rgb(222, 219, 219);
    background-color: #fafafa99;
    border-radius: 30px;
    transform: translate(-9.5%, -12%)
    

}
.date_style{
    color:rgb(0, 0, 0);
    font-family: 'Avenir';
    font-size: 13px;
    text-align: end;
    font-weight: 300;
    transform: translate(-10%, 0%)
}
.title_style{
    color:rgb(0, 0, 0);
    font-family: 'Avenir';
    font-size: 15px;
    font-weight: 300;
    transform: translate(5.5%, 0%)
}
.text_style{
    color : black;
    font-family: 'Avenir';
    font-size: 12px;
    transform: translate(+5.5%, 0%);
    font-weight: 300;
    line-height: 1.5;
    width: 345px;
    height: 72px;
    padding-bottom: 0;
    border-bottom: 0;
    
}
.text_style2{
    color:rgb(0, 0, 0);
    font-family: 'Avenir';
    font-size: 12px;
    font-weight: 300;
}
.line{
    fill:#60bac6
}
</style>
