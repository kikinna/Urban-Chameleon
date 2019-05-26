export function sortPoints (anchorP, points, that) {
  return points.sort((a, b) => {
    // console.log('a,b',a,b)
    let polarA = that.findPolarAngle(anchorP, a)
    let polarB = that.findPolarAngle(anchorP, b)
    // console.log('polarA,polarB', polarA,polarB)
    if (polarA < polarB) {
      return -1
    }
    if (polarA > polarB) {
      return 1
    }
    return 0
  })
}

export function checkPoints (p0, p1, p2, that) {
  let difAngle
  // console.log('p0,p1,p2',p0,p1,p2)
  let cwAngle = that.findPolarAngle(p0, p1)
  let ccwAngle = that.findPolarAngle(p0, p2)

  if (cwAngle > ccwAngle) {
    difAngle = cwAngle - ccwAngle
    return !(difAngle > 180)
  } else if (cwAngle < ccwAngle) {
    difAngle = ccwAngle - cwAngle
    return difAngle > 180
  }
  return true
}

export function addPoint (x, y, index, that) {
  // let point = accidentData.accidents[index]
  // let anchorP = accidentData.accidents[this.anchorPoint]
  // check if this point will be anchor point
  if (
    that.anchorPoint === null ||
    y < that.anchorPoint.Y ||
    (y === that.anchorPoint.Y && that.anchorPoint.X > x)
  ) {
    if (that.anchorPoint !== null) {
      that.points.push(that.anchorPoint)
    }
    that.anchorPoint = index
  } else {
    that.points.push(index)
  }
}
export function getAngle (deltaX, deltaY, that) {
  let ONE_RADIAN = 57.295779513082
  let angle = Math.atan2(deltaY, deltaX) * ONE_RADIAN

  if (that.reverse) {
    // this part is not working yet and im not sure if its needed
    if (angle <= 0) {
      angle += 360
    }
  } else {
    if (angle >= 0) {
      angle += 360
    }
  }
  return angle
}
// TIETO ESTE NEVIEM AKO PRESUNUT KEDZE TAM AJ DATA VYUZIVAM

// found some implementations where something like this was used, but was not needed now, but maybe will be ¯\_(ツ)_/¯
//   export function checkIfPositive(points){
//     //console.log(points)
//     points.forEach(
//       o => {
//         //console.log(accidentData.accidents[o].X)
//         if(!(accidentData.accidents[o].X < 0 && accidentData.accidents[o].Y < 0)){ //(point.x < 0 && point.y < 0)
//           return false;
//         }
//       })
//     return true;
//   }
