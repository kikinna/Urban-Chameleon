import WebMercatorViewport from 'viewport-mercator-project'
import * as d3 from 'd3' // multiple imports of d3 // only used in drawPolygon, which will be replaced by convex hull

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
export function getViewport (map) {
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

// Measures distance between two geo points in meters
export function measureGeoDistance (lat1, lon1, lat2, lon2) {
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

export function drawPolygon (svg, map) {
  const viewport = getViewport(map)

  // large house party
  const latlon1 = viewport.project([16.59512715090524, 49.20013082305056])
  const latlon2 = viewport.project([16.595096320004444, 49.19380583417316])
  const latlon3 = viewport.project([16.605566189434686, 49.19358091860195])
  const latlon4 = viewport.project([16.605512948005973, 49.19883456531343])

  // The data for our line
  let lineData = [
    { x: latlon1[0], y: latlon1[1] },
    { x: latlon2[0], y: latlon2[1] },
    { x: latlon3[0], y: latlon3[1] },
    { x: latlon4[0], y: latlon4[1] },
    { x: latlon1[0], y: latlon1[1] }
  ]

  // This is the accessor function we talked about above
  let lineFunction = d3
    .line()
    .x(function (d) {
      return d.x
    })
    .y(function (d) {
      return d.y
    })

  // The SVG Container
  let svgContainer = svg
    .append('svg')
    .attr('class', 'polygon')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight)

  d3.selectAll('.line').remove()

  // The line SVG Path we draw
  svgContainer
    .append('path')
    .attr('class', 'line')
    .attr('d', lineFunction(lineData))
    .attr('stroke', 'red')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
}

/* //maybe for testing
dragStarted(d) {
      // this.simulation.alpha(0.3).restart()
      this.simulation.restart()
      d.fx = d.x
      d.fy = d.y
    },
    dragged(d) {
      d.fx = d3.event.x
      d.fy = d3.event.y
    },
    dragEnded(d) {
      //this.simulation.alpha(0)
      this.simulation.stop(0)
      d.fx = null
      d.fy = null
    }
*/
