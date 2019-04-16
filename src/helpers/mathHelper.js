// trivial
export function sqdist (a, b) {
  return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
}

// self-documenting
export function sortArrayAlphabetically (array) {
  return array.sort(function (a, b) {
    if (a.Type < b.Type) return -1
    else if (a.Type > b.Type) return 1
    return 0
  })
}

// left as an excercise for the reader
export function occupyNearestWafflechart (p, data_structure) {
  var minDist = Infinity
  var d
  var candidate = null

  // console.log('cells', data_structure.chart_cells)

  let cells = data_structure.chart_cells // .currentBarCells

  for (var i = 0; i < cells.length; i++) {
    if (!cells[i].occupied && (d = sqdist(p, cells[i])) < minDist) {
      minDist = d
      candidate = cells[i]
    }
  }
  if (candidate) candidate.occupied = true
  if (candidate) p.candidate = candidate

  return candidate
}

// left as an excercise for the reader but it's barchart
export function occupyNearestBarchart (p, data_structure) {
  let bar_i = data_structure.bars.indexOf(p.Type)
  // console.log(p.group, bar_i)
  var minDist = Infinity
  var d
  var candidate = null

  // console.log(data_structure.chart_cells)

  let cells = data_structure.chart_cells // .currentBarCells

  // console.log(this.cells[bar_i])
  for (var i = 0; i < cells[bar_i].length; i++) {
    if (
      !cells[bar_i][i].occupied &&
      (d = sqdist(p, cells[bar_i][i])) < minDist
    ) {
      minDist = d
      candidate = cells[bar_i][i]
    }
  }
  if (candidate) candidate.occupied = true
  return candidate
}
