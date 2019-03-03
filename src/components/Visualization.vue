<template>
  <div>
    <svg></svg>
    <AccidentDetail  :title="title" :parentdata="accidents"></AccidentDetail>
    
  </div>
</template>

<script>
import * as d3 from "d3";
import store from "../store.js";
import AccidentDetail from "./AccidentDetail.vue";

export default {
  name: "Visualization",
  components:{
      AccidentDetail
  },
  data() {
    return {
      _data: null,
      graph: null,
      simulation: null,
      accidents:[],
      title: null
    };
  },
  store,
  mounted() {
    //this.loadData();
    //this.init();
    let first = {
      "OBJECTID": 1260,
      "DruhNehody": "Srážka s jedoucím nekolejovým vozidlem",
      "HlavniPricina": "Nedání přednosti v jizdě",
      "Zavineni": "Řidičem motorového vozidla",
      "Datum": "1/1/2018",
      "Den": "Pondělí",
      "DenNoc": "Noc",
      "Alkohol": "Ne",
      "Usmrceno": 0,
      "Tezce": 0,
      "Lehce": 1,
      "StavPovrchu": "Mokrý",
      "Pocasi": "Neztížené",
      "SpecifikaceMista": "Přechod pro chodce nebo v jeho blízkosti",
      "DruhVozidla": "Osobní automobil",
      "Smyk": "Ne",
      "Skoda": 60000,
      "X": 16.61599368,
      "Y": 49.1963041400001,
      "x": 1849683.9554818554,
      "y": 6308235.978302982
    };
    let second = {
      "OBJECTID": 1262,
      "DruhNehody": "Srážka s vozidlem zaparkovaným, odstaveným",
      "HlavniPricina": "Nesprávný způsob jízdy",
      "Zavineni": "Řidičem motorového vozidla",
      "Datum": "1/1/2018",
      "Den": "Pondělí",
      "DenNoc": "Den",
      "Alkohol": "Ne",
      "Usmrceno": 0,
      "Tezce": 0,
      "Lehce": 2,
      "StavPovrchu": "Mokrý",
      "Pocasi": "Mlha",
      "SpecifikaceMista": "Přechod pro chodce nebo v jeho blízkosti",
      "DruhVozidla": "Osobní automobil",
      "Smyk": "Ne",
      "Skoda": 250000,
      "X": 16.595330679,
      "Y": 49.1935570030001,
      "x": 1849683.9554818554,
      "y": 6308235.978302982
    };
    let third = {
      "OBJECTID": 1263,
      "DruhNehody": "Srážka s jedoucím nekolejovým vozidlem",
      "HlavniPricina": "Nedání přednosti v jizdě",
      "Zavineni": "Řidičem motorového vozidla",
      "Datum": "1/1/2018",
      "Den": "Pondělí",
      "DenNoc": "Noc",
      "Alkohol": "Ne",
      "Usmrceno": 0,
      "Tezce": 0,
      "Lehce": 1,
      "StavPovrchu": "Mokrý",
      "Pocasi": "Neztížené",
      "SpecifikaceMista": "Přechod pro chodce nebo v jeho blízkosti",
      "DruhVozidla": "Osobní automobil",
      "Smyk": "Ne",
      "Skoda": 60000,
      "X": 16.61599368,
      "Y": 49.1963041400001,
      "x": 1849683.9554818554,
      "y": 6308235.978302982
    };
    this.accidents.push(first);
    this.accidents.push(second);
    this.accidents.push(third);
    this.title = "Accident Detail"
    //pozor na deklaraciu premennych - "let/const/var"
    //a kedze tie obhjekty neexistovali pred "mounted" tak ich do toho pola pridavas az tu
  },
  methods: {
    async loadData() {
      const data = await d3.csv("./data/Nehody2018.csv");
      this._data = data;
    },
    init() {
      //this.render();
    },
    render() {
      //let theMap = this.$store.state.map;
      console.log(this.$store.state);
      let map = this.$store.state.map;
      let container = map.getCanvasContainer(); //this.$store.state.container;
      //let container = theMap.getCanvasContainer();
      //let container = d3.select("#map");
      //d3.select(this.$el)
      let svg = d3
        .select(container)
        .attr("id", "test_svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);

      let g = svg
        .append("g")
        .append("circle")
        .attr("class", "nodes")
        .attr("cx", "250")
        .attr("cy", "150")
        .attr("r", "100");
    }
  }
};

</script>

<style>
.nodes {
  fill: rgb(177, 0, 0);
  stroke: #fff;
  stroke-width: 2px;
}

#test_svg {
  position: absolute;
}
</style>
