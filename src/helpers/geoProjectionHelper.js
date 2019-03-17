import WebMercatorViewport from 'viewport-mercator-project'

/**
 * Manages coordinate system transformations
 * Returns viewport with functions project() and unproject()
 * 
 * viewport.project([lat, lon]) 
 * projects map coordinates to pixel coordinates
 * [longitude, latitude] => [x, y]
 * 
 * viewport.unproject([x, y])
 * unprojects pixel coordinates to map coordinates
 * [x, y] => [lng, lat]
 */
export function getViewport(map) {
  const center = map.getCenter()
  const zoom = map.getZoom()
  const pitch = map.getPitch()
  const bearing = map.getBearing()

  const viewport = new WebMercatorViewport({
    longitude: center.lng,
    latitude: center.lat,
    zoom: zoom,
    width: window.innerWidth,
    height: window.innerHeight,
    pitch: pitch,
    bearing: bearing
  })
  return viewport
}

//Measures distance between two geo points in meters
export function measureGeoDistance(lat1, lon1, lat2, lon2) {
  // generally used geo measurement function
  var R = 6378.137 // Radius of earth in KM
  var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180
  var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = R * c
  return d * 1000 // meters
}
