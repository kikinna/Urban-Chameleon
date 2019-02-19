<template>
    <mapbox
        access-token="pk.eyJ1Ijoic2hvbmdvbG9sbyIsImEiOiJjamVoN25yYTQxMXBwMzNuc2ZkeGk5eGtzIn0.ZQNxwHhtZDBfsVNjDL0c7A"
        :map-options="{
            style: 'https://maps.tilehosting.com/styles/positron/style.json?key=erAyQhECgFpHi6K8tzqm',//'mapbox://styles/mapbox/light-v9',
            center: [16.606837, 49.195060],
            zoom: 10
        }"
        :geolocate-control="{
            show: true,
            position: 'top-left'
        }"
        :scale-control="{
            show: true,
            position: 'top-left'
        }"
        :fullscreen-control="{
            show: true,
            position: 'top-left'
        }"
        @map-init="mapInitialized"
        @map-load="mapLoaded"
        @map-click="mapClicked"
        @geolocate-error="geolocateError"
        @geolocate-geolocate="geolocate"
    >
    </mapbox>
</template>

<script>
import Mapbox from 'mapbox-gl-vue';

window.mapboxgl = require('mapbox-gl');

export default {
  name: 'Map',
  components: {
     'mapbox': Mapbox
  },
  methods: {
    mapInitialized(map) {
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
      alert('Map Clicked!');
    },
    geolocateError(control, positionError) {
      console.log(positionError);
    },
    geolocate(control, position) {
      console.log(`User position: ${position.coords.latitude}, ${position.coords.longitude}`);
    }
  }
}
</script>

<style scoped>
  #map {position: absolute; top: 0; right: 0; bottom: 0; left: 0;}
</style>