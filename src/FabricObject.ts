import { Util } from './Util'

/** 物体基类 */
export class FabricObject {
  /** 物体类型标识 */
  public type = 'object'
  /** 是否可见 */
  public visible = true
  /** 是否处于激活状态，是否被选中 */
  public active = true
  /** 物体位置的 top 值，就是 y */
  public top = 0
  /** 物体位置的 left 值，就是 x */
  public left = 0
  /** 物体的原始宽度 */
  public width = 0
  /** 物体的原始高度 */
  public height = 0
  /** 物体当前的缩放倍数 x */
  public scaleX = 1
  /** 物体当前的缩放倍数 y */
  public scaleY = 1
  /** 物体当前的旋转角度 */
  public angle = 0
  /** 默认水平变换中心 left | right | center */
  public originX = 'center'
  /** 默认垂直变换中心 top | bottom | center */
  public originY = 'center'
  /** 物体默认填充颜色 */
  public fill = 'rgb(0,0,0)'
  /** 混合模式 globalCompositeOperation */
  // public fillRule: string = 'source-over';
  /** 物体默认描边颜色，默认无 */
  public stroke?: string
  /** 边框宽度 */
  public strokeWidth = 1
  /** 线宽 */
  public borderWidth = 1
  /** 边框和物体的内间距，也是个配置项，和 css 中的 padding 一个意思 */
  public padding = 1
  /** 是否正在拖动 */
  public isMoving = false
  /** 边框颜色 */
  public borderColor = 'red'
  /** 旋转控制点到边框的距离 */
  public rotatingPointOffset = 10
  /** 是否有旋转控制点 */
  public hasRotatingPoint = true
  /** 是否有控制点 */
  public hasControls = true
  /** 控制点 矩形大小 */
  public cornerSize = 6
  /** 控制点 颜色 */
  public cornerColor = 'red'

  /** 列举常用的属性 */
  public stateProperties: string[] = ('top left width height scaleX scaleY ' + 'flipX flipY angle cornerSize fill originX originY ' + 'stroke strokeWidth ' + 'borderWidth transformMatrix visible').split(' ')

  constructor(options: any) {
    this.initialize(options) // 初始化各种属性，就是简单的赋值
  }

  initialize(options) {
    options && this.setOptions(options)
  }

  /** 渲染物体的通用流程 */
  render(ctx: CanvasRenderingContext2D) {
    // 看不见的物体不绘制
    if (this.width === 0 || this.height === 0 || !this.visible)
      return

    // 凡是要变换坐标系或者设置画笔属性都需要用先用 save 保存和再用 restore 还原，避免影响到其他东西的绘制
    ctx.save()
    // 1. 坐标变换
    this.transform(ctx)
    // 2、绘制物体
    this._render(ctx)
    // 如果是选中态
    if (this.active) {
      // 绘制物体边框
      this.drawBorders(ctx)
      // 绘制物体四周的控制点，共 9 个
      this.drawControls(ctx)
    }
    // 状态回退
    ctx.restore()
  }

  /** 绘制选中边框 */
  drawBorders(ctx: CanvasRenderingContext2D) {
    const padding = this.padding
    const padding2 = padding * 2
    const strokeWidth = 1 // 选择边框度始终是 1， 不受缩放的影响，当然可以做成配置项

    ctx.save()
    // 物体变换的时候使其透明度减半，提升用户体验
    ctx.globalAlpha = this.isMoving ? 0.5 : 1
    ctx.strokeStyle = this.borderColor
    ctx.lineWidth = strokeWidth

    /** 画边框的时候需要把 transform 变换中的 scale 效果抵消，这样才能画出原始大小的线条 */
    ctx.scale(1 / this.scaleX, 1 / this.scaleY)

    const w = this.getWidth()
    const h = this.getHeight()

    // 这里直接用原生的 api strokeRect 画边框即可，当然要考虑到边宽和内间距的影响
    // 就是画一个规规矩矩的矩形
    ctx.strokeRect(
      (-(w / 2) - padding - strokeWidth / 2),
      (-(h / 2) - padding - strokeWidth / 2),
      (w + padding2 + strokeWidth),
      (h + padding2 + strokeWidth),
    )

    // 除了画边框，还要画旋转控制点和边框相连接的那条线
    if (this.hasRotatingPoint && this.hasControls) {
      const rotateHeight = (-h - strokeWidth - padding * 2) / 2
      ctx.beginPath()
      ctx.moveTo(0, rotateHeight)
      ctx.lineTo(0, rotateHeight - this.rotatingPointOffset) // rotatingPointOffset 是旋转控制点到边框的距离
      ctx.closePath()
      ctx.stroke()
    }

    ctx.restore()
    return this
  }

  /** 绘制控制点 */
  drawControls(ctx: CanvasRenderingContext2D) {
    if (!this.hasControls) return

    // 因为画布已经经过变换，所以大部分数值需要除以 scale 来抵消变换
    // 而上面那种画边框的操作则是把坐标系缩放回去，写法不同，效果是一样的
    const size = this.cornerSize
    const size2 = size / 2
    const strokeWidth2 = this.strokeWidth / 2
    // top 和 left 值为物体左上角的点
    const left = -(this.width / 2)
    const top = -(this.height / 2)
    let _left
    let _top
    const sizeX = size / this.scaleX
    const sizeY = size / this.scaleY
    const paddingX = this.padding / this.scaleX
    const paddingY = this.padding / this.scaleY
    const scaleOffsetY = size2 / this.scaleY
    const scaleOffsetX = size2 / this.scaleX
    const scaleOffsetSizeX = (size2 - size) / this.scaleX
    const scaleOffsetSizeY = (size2 - size) / this.scaleY
    const height = this.height
    const width = this.width

    const drawCorner = () => {
      ctx.clearRect(_left, _top, sizeX, sizeY)
      ctx.fillRect(_left, _top, sizeX, sizeY)
    }

    ctx.save()

    ctx.lineWidth = this.borderWidth / Math.max(this.scaleX, this.scaleY)
    ctx.globalAlpha = this.isMoving ? 0.5 : 1
    ctx.strokeStyle = ctx.fillStyle = this.cornerColor
    // 绘制控制点，也要考虑到线宽和 padding 的影响

    // 左上控制点
    _left = left - scaleOffsetX - strokeWidth2 - paddingX
    _top = top - scaleOffsetY - strokeWidth2 - paddingY
    drawCorner()

    // top middle 上中的控制点
    _left = 0 - scaleOffsetY
    drawCorner()

    // top right 右上角的控制点
    _left = -left - scaleOffsetX + strokeWidth2 + paddingX
    drawCorner()

    // middle right 右中的控制点
    _top = 0 - scaleOffsetY
    drawCorner()

    // bottom right 右下的控制点
    _top = -top - scaleOffsetY + strokeWidth2 + paddingY
    drawCorner()

    // bottom middle 中下的控制点
    _left = 0 - scaleOffsetX
    drawCorner()

    // bottom left 左下
    _left = left - scaleOffsetX - strokeWidth2 - paddingX
    drawCorner()

    // middle left 左中的控制点
    _top = 0 - scaleOffsetY
    drawCorner()

    // 旋转控制点
    _left = 0 - scaleOffsetY
    _top = top - sizeY - strokeWidth2 - paddingY - this.rotatingPointOffset
    drawCorner()

    ctx.restore()
    return this
  }

  /** 具体由子类来实现，因为这确实是每个子类物体所独有的 */
  _render(_ctx: CanvasRenderingContext2D) {}

  transform(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.left, this.top)
    ctx.rotate(Util.degreesToRadians(this.angle))
    ctx.scale(this.scaleX, this.scaleY)
  }

  setOptions(options) {
    for (const prop in options)
      this[prop] = options[prop]
  }

  /** 获取当前大小，包含缩放效果 */
  getWidth() {
    return this.width * this.scaleX
  }

  /** 获取当前大小，包含缩放效果 */
  getHeight() {
    return this.height * this.scaleY
  }
}
