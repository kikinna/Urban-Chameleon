<template>
  <div id="app">
    <Mapbox
      access-token="pk.eyJ1Ijoic2hvbmdvbG9sbyIsImEiOiJjamVoN25yYTQxMXBwMzNuc2ZkeGk5eGtzIn0.ZQNxwHhtZDBfsVNjDL0c7A"
      :map-options="{
        container: 'map',
        style:
          'https://maps.tilehosting.com/styles/positron/style.json?key=erAyQhECgFpHi6K8tzqm', //'mapbox://styles/mapbox/light-v9',
        center: [16.606837, 49.19506],
        zoom: 14
      }"
      :geolocate-control="{
        show: true,
        position: 'top-left',
        options: {
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }
      }"
      :scale-control="{
        show: true,
        position: 'top-left'
      }"
      :fullscreen-control="{
        show: false,
        position: 'top-left'
      }"
      @map-init="mapInit"
      @map-load="mapLoaded"
      @map-click="mapClicked"
      @map-mousemove="mapMouseMoved"
      @geolocate-geolocate="geolocate"
      @map-zoom="changeLevelOfDetail"
    ></Mapbox>
    <GaussPreprocess></GaussPreprocess>

    <Visualization></Visualization>
  </div>
</template>

<script>
import Mapbox from './components/Mapbox.vue'
import Visualization from './components/Visualization.vue'
import GaussPreprocess from './components/GaussPreprocess.vue'
//import VisualizationCircles from './components/VisualizationCircles.vue'
import store from './store.js'

export default {
  name: 'app',
  data() {
    return {
      csv_data: null,
      hello: 'hello',
      paper: null
    }
  },
  components: {
    Mapbox,
    Visualization,
    GaussPreprocess
  },
  store,
  created() {
    // Try to load data here? Not. Somewhere else.
    // this.paper = paper.setup(document.getElementById('gauss-preprocess'));
  },
  methods: {
    mapInit(map) {
      const Draw = new MapboxDraw()
      map.addControl(Draw)
      this.$store.commit('loadMap', map)
    },
    mapLoaded(map) {},
    mapClicked(map, e) {
      console.log(map.getZoom())
    },
    mapMouseMoved(map, e) {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['points']
      })
      map.getCanvas().style.cursor = features.length ? 'pointer' : ''
    },
    geolocate(control, position) {
      console.log(
        `User position: ${position.coords.latitude}, ${
          position.coords.longitude
        }`
      )
    },
    changeLevelOfDetail(map) {
      /*if (map.getZoom() > 15) {
				console.log("Ani s takýmto levelom priblíženia stále nevidíme Megi. :/");
			}
			else {
				console.log("¯\_(ツ)_/¯");
			}*/
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */
  color: #2c3e50;
  margin-top: 0px;
}

#map {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

@import '~bulma/sass/utilities/_all';

// Set your colors
$primary: #696969;
$primary-invert: findColorInvert($primary);
// $twitter: #4099FF;
// $twitter-invert: findColorInvert($twitter);

$colors: (
  'primary': (
    $primary,
    $primary-invert
  )
);

$link: $primary;
$link-invert: $primary-invert;
$link-focus-border: $primary;

// Import Bulma and Buefy styles
@import '~bulma';
@import '~buefy/src/scss/buefy';
</style>
