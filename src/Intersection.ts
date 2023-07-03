import { Point } from './Point'

/** 检测多边形、线段是否相交的一个类 */
export class Intersection {
  /** 相交状态 No Intersection | Intersection | Coincident | Parallel */
  public status
  public points!: Point[]
  constructor(status) {
    this.init(status)
  }

  init(status) {
    this.status = status
    this.points = []
  }

  appendPoint(point: Point) {
    this.points.push(point)
  }

  appendPoints(points: Point[]) {
    this.points = this.points.concat(points)
  }

  /**
     * 判断两条线段是否想交
     * @param a1 线段1 起点
     * @param a2 线段1 终点
     * @param b1 线段2 起点
     * @param b2 线段3 终点
     */
  static intersectLineLine(a1: Point, a2: Point, b1: Point, b2: Point): Intersection {
    // 向量叉乘公式 `a✖️b = (x1, y1)✖️(x2, y2) = x1y2 - x2y1`
    // http://blog.letow.top/2017/11/13/vector-cross-product-cal-intersection/
    let result
    // b1->b2向量 与 a1->b1向量的向量叉乘
    const ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)
    // a1->a2向量 与 a1->b1向量的向量叉乘
    const ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)
    // a1->a2向量 与 b1->b2向量的向量叉乘
    const u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y)
    if (u_b !== 0) {
      const ua = ua_t / u_b
      const ub = ub_t / u_b
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        result = new Intersection('Intersection')
        result.points.push(new Point(a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)))
      }
      else {
        result = new Intersection('No Intersection')
      }
    }
    else {
      // u_b == 0时，角度为0或者180 平行或者共线不属于相交
      if (ua_t === 0 || ub_t === 0)
        result = new Intersection('Coincident')

      else
        result = new Intersection('Parallel')
    }
    return result
  }

  /**
     * 检测线段和多边形是否相交
     * @param a1 线段起点
     * @param a2 线段终点
     * @param points 多边形顶点
     * @returns
     */
  static intersectLinePolygon(a1: Point, a2: Point, points: Point[]): Intersection {
    const result = new Intersection('No Intersection')
    const length = points.length

    for (let i = 0; i < length; i++) {
      const b1 = points[i] // 多边形每条边的起点
      const b2 = points[(i + 1) % length] // 多边形每条边的终点
      const inter = Intersection.intersectLineLine(a1, a2, b1, b2)

      result.appendPoints(inter.points)
    }
    if (result.points.length > 0)
      result.status = 'Intersection'

    return result
  }

  static intersectPolygonPolygon(points1, points2) {
    const result = new Intersection('No Intersection')
    const length = points1.length

    for (let i = 0; i < length; i++) {
      const a1 = points1[i]
      const a2 = points1[(i + 1) % length]
      const inter = Intersection.intersectLinePolygon(a1, a2, points2)

      result.appendPoints(inter.points)
    }
    if (result.points.length > 0)
      result.status = 'Intersection'

    return result
  }

  /**
     * 检测物体是否与拖蓝选区相交
     * @param points 物体包围盒的四个顶点的坐标
     * @param r1 拖蓝选区左上角的点
     * @param r2 拖蓝选区右下角的点
     * @returns
     */
  static intersectPolygonRectangle(points: Point[], r1: Point, r2: Point): Intersection {
    const topLeft: Point = r1.min(r2) // 拖蓝选区左上角
    const bottomRight: Point = r1.max(r2) // 拖蓝选区右下角
    const topRight: Point = new Point(bottomRight.x, topLeft.y) // 拖蓝选区右上角
    const bottomLeft: Point = new Point(topLeft.x, bottomRight.y) // 拖蓝选区左下角
    // 检测每条边是否与物体相交
    const inter1 = Intersection.intersectLinePolygon(topLeft, topRight, points)
    const inter2 = Intersection.intersectLinePolygon(topRight, bottomRight, points)
    const inter3 = Intersection.intersectLinePolygon(bottomRight, bottomLeft, points)
    const inter4 = Intersection.intersectLinePolygon(bottomLeft, topLeft, points)
    const result = new Intersection('No Intersection')

    result.appendPoints(inter1.points)
    result.appendPoints(inter2.points)
    result.appendPoints(inter3.points)
    result.appendPoints(inter4.points)

    if (result.points.length > 0) {
      // 如果有至少一条边与物体相交
      result.status = 'Intersection'
    }
    return result
  }
}
