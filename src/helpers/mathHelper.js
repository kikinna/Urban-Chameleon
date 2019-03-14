export function sqdist(a, b) {
  return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
}

export function occupyNearest(p, cells) {
  var minDist = 1000000
  var d
  var candidate = null
  for (var i = 0; i < cells.length; i++) {
    if (!cells[i].occupied && (d = sqdist(p, cells[i])) < minDist) {
      minDist = d
      candidate = cells[i]
    }
  }
  if (candidate) candidate.occupied = true
  return candidate
}
