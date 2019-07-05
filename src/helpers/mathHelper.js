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
export function occupyNearestWafflechart (p, dataStructure) {
  var minDist = Infinity
  var d
  var candidate = null

  // console.log('cells', dataStructure.chart_cells)
  // console.log('LOOJK AT MEEE', p)

  let cells = dataStructure.chart_cells // .currentBarCells

  for (var i = 0; i < cells.length; i++) {
    if (
      !cells[i].occupied &&
      (d = sqdist(p, cells[i])) < minDist &&
      p.Type === cells[i].waffleType
    ) {
      minDist = d
      candidate = cells[i]
    }
  }
  if (candidate) candidate.occupied = true
  if (candidate) p.candidate = candidate

  return candidate
}

// left as an excercise for the reader but it's barchart
export function occupyNearestBarchart (p, dataStructure) {
  let bar_i = dataStructure.bars.indexOf(p.Type)
  // console.log(p.group, bar_i)
  var minDist = Infinity
  var d
  var candidate = null

  // console.log(dataStructure.chart_cells)

  let cells = dataStructure.chart_cells // .currentBarCells

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
