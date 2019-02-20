<template>
  <div id="app">
    <Mapbox
        access-token="pk.eyJ1Ijoic2hvbmdvbG9sbyIsImEiOiJjamVoN25yYTQxMXBwMzNuc2ZkeGk5eGtzIn0.ZQNxwHhtZDBfsVNjDL0c7A"
        :map-options="{
            style: 'https://maps.tilehosting.com/styles/positron/style.json?key=erAyQhECgFpHi6K8tzqm',//'mapbox://styles/mapbox/light-v9',
            center: [16.606837, 49.195060],
            zoom: 10
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
					show: true,
					position: 'top-left'
				}"
				@map-init="mapInit"
        @map-click="mapClicked"
				@map-mousemove="mapMouseMoved"
				@geolocate-geolocate="geolocate"
    >
    </Mapbox>
  </div>
</template>

<script>
import Mapbox from './components/Mapbox.vue'

export default {
  name: 'app',
  components: {
     Mapbox
  },
  methods: {
    mapInit(map) {
			const Draw = new MapboxDraw();

      map.addControl(Draw);
    },
    mapClicked(map, e) {
			console.log(map.getZoom());
		},
		mapMouseMoved(map, e) {
			const features = map.queryRenderedFeatures(e.point, { layers: ['points'] });
			map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
		},
		geolocate(control, position) {
			console.log(`User position: ${position.coords.latitude}, ${position.coords.longitude}`);
		}
  }
}

</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */
  color: #2c3e50;
  margin-top: 60px;
}

 #map {position: absolute; top: 0; right: 0; bottom: 0; left: 0;}

</style>




