

  export function sortPoints(anchorP, points, that){
    return points.sort((a,b) => {
      let polarA = that.findPolarAngle(anchorP,a);
      let polarB = that.findPolarAngle(anchorP,b);
      if(polarA < polarB){
        return -1;
      }
      if(polarA > polarB){
        return 1;
      }
      return 0;
    })
  }

  export function checkPoints(p0,p1,p2, that){
    let difAngle;
    let cwAngle = that.findPolarAngle(p0, p1);
    let ccwAngle = that.findPolarAngle(p0, p2);

    if (cwAngle > ccwAngle) {
      difAngle = cwAngle - ccwAngle;
      return !(difAngle > 180);
    } else if (cwAngle < ccwAngle) {
      difAngle = ccwAngle - cwAngle;
      return (difAngle > 180);
    }
    return true;
  }
  

  //TIETO ESTE NEVIEM AKO PRESUNUT KEDZE TAM AJ DATA VYUZIVAM

  //found some implementations where something like this was used, but was not needed now, but maybe will be ¯\_(ツ)_/¯
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

  export function  findPolarAngle(anchor,p){
    //console.log("heh")
    let ONE_RADIAN = 57.295779513082;
    let deltaX = null;
    let deltaY = null;

    let point = accidentData.accidents[p];
    let anchorP = accidentData.accidents[anchor];
    deltaX = (point.X - anchorP.X);
    deltaY = (point.Y - anchorP.Y);

    if (deltaX == 0 && deltaY == 0) {
        return 0;
    }

    let angle = Math.atan2(deltaY, deltaX) * ONE_RADIAN;

    // if (this.reverse){ //this part is not working yet and im not sure if its needed
    //     if (angle <= 0) {
    //         angle += 360;
    //     }
    // }else{
        if (angle >= 0) {
            angle += 360;
        }
    //}
    return angle;
  }

  export function getHull(anchorP){
    let hullPoints = []
    let pointis = []
    let pointsLength = null;

    pointis = this.sortPoints(anchorP);
    pointsLength = pointis.length;

    //if there is less than 3 points, joining these is correct hull 
    if (pointsLength < 3) {
      pointis.unshift(anchorP);
      return points;
    }

    //move first two points to output
    hullPoints.push(pointis.shift(), pointis.shift());

    //this looks like a really bad loop, but acctually it is repeated until no concave points are present
    while (true) {
      let p0 = null;
      let p1 = null;
      let p2 = null;

      hullPoints.push(pointis.shift());
      p0 = hullPoints[hullPoints.length - 3];
      p1 = hullPoints[hullPoints.length - 2];
      p2 = hullPoints[hullPoints.length - 1];

      if (this.checkPoints(p0, p1, p2)) {
          hullPoints.splice(hullPoints.length - 2, 1);
      }

      if (pointis.length == 0) {
        if (pointsLength == hullPoints.length) {
          //check for duplicate anchorPoint edge-case, if not found, add the anchorpoint as the first item.
          let ap = anchorP;
          //remove any udefined elements in the hullPoints array.
          hullPoints = hullPoints.filter(function(p) { return !!p; });
          if (!hullPoints.some(function(p){
            return(accidentData.accidents[p].X == accidentData.accidents[ap].X && accidentData.accidents[p].Y == accidentData.accidents[ap].Y);
          })) {
            hullPoints.unshift(anchorP);
          }
          return hullPoints;
        }
        pointis = hullPoints;
        pointsLength = pointis.length;
        hullPoints = [];
        hullPoints.push(pointis.shift(), pointis.shift());
      }
    }
  }