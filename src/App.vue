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
				@map-load="mapLoaded"
        @map-click="mapClicked"
				@map-mousemove="mapMouseMoved"
				@geolocate-geolocate="geolocate"
				@map-zoom="changeLevelOfDetail"
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
		mapLoaded(map) {
			map.addLayer({
        'id': 'points',
        'type': 'symbol',
        'source': {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': [{
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': [-77.03238901390978, 38.913188059745586]
              },
              'properties': {
                'title': 'Mapbox DC',
                'icon': 'monument'
              }
            }, {
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': [-122.414, 37.776]
              },
              'properties': {
                'title': 'Mapbox SF',
                'icon': 'harbor'
              }
            }]
          }
        },
        'layout': {
          'icon-image': '{icon}-15',
          'text-field': '{title}',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 0.6],
          'text-anchor': 'top'
        }
      });
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
		},
		changeLevelOfDetail(map) {
			if (map.getZoom() > 15) {
				console.log("Ani s takýmto levelom priblíženia stále nevidíme Megi. :/");
			}
			else {
				console.log("¯\_(ツ)_/¯");
			}
		}
  }
}
//jop

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




