export function distance (a, b) {
  let lat1 = a.Y
  let lon1 = a.X
  let lat2 = b.Y
  let lon2 = b.X
  let rad = Math.PI / 180
  let dLat = (lat2 - lat1) * rad
  let dLon = (lon2 - lon1) * rad
  lat1 = lat1 * rad
  lat2 = lat2 * rad
  let x = Math.sin(dLat / 2)
  let y = Math.sin(dLon / 2)
  let res = x * x + y * y * Math.cos(lat1) * Math.cos(lat2)
  return Math.atan2(Math.sqrt(res), Math.sqrt(1 - res))
}
