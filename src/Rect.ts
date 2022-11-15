import { FabricObject } from './FabricObject'

export class Rect extends FabricObject {
  /** 矩形标识 */
  public type = 'rect'
  /** 圆角 rx */
  public rx = 0
  /** 圆角 ry */
  public ry = 0

  constructor(options) {
    super(options)
    this._initStateProperties()
    this._initRxRy(options)
  }

  /** 单纯的绘制一个普普通通的矩形 */
  _render(ctx: CanvasRenderingContext2D): void {
    const rx = this.rx || 0
    const ry = this.ry || 0
    const x = -this.width / 2
    const y = -this.height / 2
    const w = this.width
    const h = this.height
    // 绘制一个新的东西，大部分情况下都要开启一个新路径，要养成习惯
    ctx.beginPath()
    // 从左上角开始向右顺时针画一个矩形，这里就是单纯的绘制一个规规矩矩的矩形
    // 不考虑旋转缩放啥的，因为旋转缩放会在调用 _render 函数之前处理
    // 另外这里考虑了圆角的实现，所以用到了贝塞尔曲线，不然你可以直接画成四条线段，再懒一点可以直接调用原生方法 fillRect 和 strokeRect
    // 不过自己写的话自由度更高，也方便扩展
    ctx.moveTo(x + rx, y)
    // 上边线
    ctx.lineTo(x + w - rx, y)
    // 右上圆角
    ctx.bezierCurveTo(x + w, y, x + w, y + ry, x + w, y + ry)
    // 右边线
    ctx.lineTo(x + w, y + h - ry)
    // 右下圆角
    ctx.bezierCurveTo(x + w, y + h, x + w - rx, y + h, x + w - rx, y + h)
    // 下边线
    ctx.lineTo(x + rx, y + h)
    // 左下圆角
    ctx.bezierCurveTo(x, y + h, x, y + h - ry, x, y + h - ry)
    // 左边线
    ctx.lineTo(x, y + ry)
    // 左上圆角
    ctx.bezierCurveTo(x, y, x + rx, y, x + rx, y)

    ctx.closePath()

    if (this.fill) {
      ctx.fillStyle = this.fill
      ctx.fill()
    }

    if (this.stroke) {
      ctx.strokeStyle = this.stroke
      ctx.stroke()
    }
  }

  /** 一些共有的和独有的属性 */
  _initStateProperties() {
    this.stateProperties = this.stateProperties.concat(['rx', 'ry'])
  }

  /** 初始化圆角值 */
  _initRxRy(options) {
    this.rx = options.rx || 0
    this.ry = options.ry || 0
  }
}
