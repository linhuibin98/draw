import { Point } from './Point'
import type { Coords, Corner } from './types/object'
import { Util } from './Util'
import { Intersection } from './Intersection'
import { EventCenter } from './EventCenter'
import type { Offset } from './types/canvas'

/** 物体基类 */
export class FabricObject extends EventCenter {
  /** 物体类型标识 */
  public type = 'object'
  /** 是否可见 */
  public visible = true
  /** 是否处于激活状态，是否被选中 */
  public active = false
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
  /** 左右镜像，比如反向拉伸控制点 */
  public flipX = false
  /** 上下镜像，比如反向拉伸控制点 */
  public flipY = false
  /** 物体缩放后的宽度 */
  public currentWidth = 0
  /** 物体缩放后的高度 */
  public currentHeight = 0
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
  /** 物体控制点用 stroke 还是 fill */
  public transparentCorners = false
  /** 控制点 矩形大小 */
  public cornerSize = 6
  /** 控制点 颜色 */
  public cornerColor = 'red'
  /** 物体控制点位置，随时变化 */
  public oCoords!: Coords
  /** 物体所在的 canvas 画布 */
  public canvas
  /** 物体执行变换之前的状态 */
  public originalState
  /** 物体所属的组 */
  public group
  /** 物体被拖蓝选区保存的时候需要临时保存下 hasControls 的值 */
  public orignHasControls = true

  /** 列举常用的属性 */
  public stateProperties: string[] = (
    'top left width height scaleX scaleY '
    + 'flipX flipY angle cornerSize fill originX originY '
    + 'stroke strokeWidth '
    + 'borderWidth transformMatrix visible'
  ).split(' ')

  constructor(options: any) {
    super()
    this.initialize(options) // 初始化各种属性，就是简单的赋值
  }

  initialize(options) {
    options && this.setOptions(options)
  }

  /** 渲染物体的通用流程 */
  render(ctx: CanvasRenderingContext2D) {
    // 看不见的物体不绘制
    if (this.width === 0 || this.height === 0 || !this.visible) return

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
      -(w / 2) - padding - strokeWidth / 2,
      -(h / 2) - padding - strokeWidth / 2,
      w + padding2 + strokeWidth,
      h + padding2 + strokeWidth,
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
    // 控制点是实心还是空心
    const methodName = this.transparentCorners ? 'strokeRect' : 'fillRect'

    const drawCorner = () => {
      ctx.clearRect(_left, _top, sizeX, sizeY)
      ctx[methodName](_left, _top, sizeX, sizeY)
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
    for (const prop in options) this[prop] = options[prop]
  }

  setActive(active = false): FabricObject {
    this.active = !!active
    return this
  }

  getAngle(): number {
    return this.angle
  }

  get(key: string) {
    return this[key]
  }

  set(key: string, value): FabricObject {
    // if (typeof value === 'function') value = value(this.get(key));
    // if (key === 'scaleX' || key === 'scaleY') {
    //     value = this._constrainScale(value);
    // }
    // if (key === 'width' || key === 'height') {
    //     this.minScaleLimit = Util.toFixed(Math.min(0.1, 1 / Math.max(this.width, this.height)), 2);
    // }
    if (key === 'scaleX' && value < 0) {
      this.flipX = !this.flipX
      value *= -1
    }
    else if (key === 'scaleY' && value < 0) {
      this.flipY = !this.flipY
      value *= -1
    }
    this[key] = value
    return this
  }

  /** 获取当前大小，包含缩放效果 */
  getWidth() {
    return this.width * this.scaleX
  }

  /** 获取当前大小，包含缩放效果 */
  getHeight() {
    return this.height * this.scaleY
  }

  setupState() {
    this.originalState = {}
    this.saveState()
  }

  /** 保存物体当前的状态到 originalState 中 */
  saveState(): FabricObject {
    this.stateProperties.forEach((prop) => {
      this.originalState[prop] = this[prop]
    })
    return this
  }

  /** 获取物体中心点 */
  getCenterPoint() {
    return this.translateToCenterPoint(new Point(this.left, this.top), this.originX, this.originY)
  }

  /** 将中心点移到变换基点 */
  translateToCenterPoint(point: Point, originX: string, originY: string): Point {
    let cx = point.x
    let cy = point.y

    if (originX === 'left')
      cx = point.x + this.getWidth() / 2

    else if (originX === 'right')
      cx = point.x - this.getWidth() / 2

    if (originY === 'top')
      cy = point.y + this.getHeight() / 2

    else if (originY === 'bottom')
      cy = point.y - this.getHeight() / 2

    const p = new Point(cx, cy)
    if (this.angle)
      return Util.rotatePoint(p, point, Util.degreesToRadians(this.angle))

    else
      return p
  }

  hasStateChanged(): boolean {
    return this.stateProperties.some((prop) => {
      return this[prop] !== this.originalState[prop]
    })
  }

  /**
     * 物体与框选区域是否相交，用框选区域的四条边分别与物体的四条边求交
     * @param {Point} selectionTL 拖蓝框选区域左上角的点
     * @param {Point} selectionBR 拖蓝框选区域右下角的点
     * @returns {boolean}
     */
  intersectsWithRect(selectionTL: Point, selectionBR: Point): boolean {
    const oCoords = this.oCoords
    const tl = new Point(oCoords.tl.x, oCoords.tl.y)
    const tr = new Point(oCoords.tr.x, oCoords.tr.y)
    const bl = new Point(oCoords.bl.x, oCoords.bl.y)
    const br = new Point(oCoords.br.x, oCoords.br.y)

    const intersection = Intersection.intersectPolygonRectangle([tl, tr, br, bl], selectionTL, selectionBR)
    return intersection.status === 'Intersection'
  }

  /**
     * 物体是否被框选区域包含
     * @param {Point} selectionTL 拖蓝框选区域左上角的点
     * @param {Point} selectionBR 拖蓝框选区域右下角的点
     * @returns {boolean}
     */
  isContainedWithinRect(selectionTL: Point, selectionBR: Point): boolean {
    const oCoords = this.oCoords
    const tl = new Point(oCoords.tl.x, oCoords.tl.y)
    const tr = new Point(oCoords.tr.x, oCoords.tr.y)
    const bl = new Point(oCoords.bl.x, oCoords.bl.y)

    return tl.x > selectionTL.x && tr.x < selectionBR.x && tl.y > selectionTL.y && bl.y < selectionBR.y
  }

  /** 检测哪个控制点被 click / hover */
  _findTargetCorner(e: MouseEvent, offset: Offset): boolean | string {
    if (!this.hasControls || !this.active) return false
    const pointer = Util.getPointer(e, this.canvas.upperCanvasEl)
    const ex = pointer.x - offset.left
    const ey = pointer.y - offset.top
    let xpoints
    let lines

    for (const i in this.oCoords) {
      if (i === 'mtr' && !this.hasRotatingPoint)
        continue

      lines = this._getImageLines(this.oCoords[i].corner)

      // debugger 绘制物体控制点的四个顶点
      // this.canvas.contextTop.fillRect(lines.bottomline.d.x, lines.bottomline.d.y, 2, 2);
      // this.canvas.contextTop.fillRect(lines.bottomline.o.x, lines.bottomline.o.y, 2, 2);

      // this.canvas.contextTop.fillRect(lines.leftline.d.x, lines.leftline.d.y, 2, 2);
      // this.canvas.contextTop.fillRect(lines.leftline.o.x, lines.leftline.o.y, 2, 2);

      // this.canvas.contextTop.fillRect(lines.topline.d.x, lines.topline.d.y, 2, 2);
      // this.canvas.contextTop.fillRect(lines.topline.o.x, lines.topline.o.y, 2, 2);

      // this.canvas.contextTop.fillRect(lines.rightline.d.x, lines.rightline.d.y, 2, 2);
      // this.canvas.contextTop.fillRect(lines.rightline.o.x, lines.rightline.o.y, 2, 2);

      xpoints = this._findCrossPoints(ex, ey, lines)
      if (xpoints % 2 === 1 && xpoints !== 0)
        return i
    }
    return false
  }

  /** 重新设置物体包围盒的边框和各个控制点，包括位置和大小 */
  setCoords(): FabricObject {
    const strokeWidth = this.strokeWidth > 1 ? this.strokeWidth : 0
    const padding = this.padding
    const radian = Util.degreesToRadians(this.angle)

    this.currentWidth = (this.width + strokeWidth) * this.scaleX + padding * 2
    this.currentHeight = (this.height + strokeWidth) * this.scaleY + padding * 2

    // 物体中心点到顶点的斜边长度
    const _hypotenuse = Math.sqrt((this.currentWidth / 2) ** 2 + (this.currentHeight / 2) ** 2)
    const _angle = Math.atan(this.currentHeight / this.currentWidth)

    // offset added for rotate and scale actions
    const offsetX = Math.cos(_angle + radian) * _hypotenuse
    const offsetY = Math.sin(_angle + radian) * _hypotenuse
    const sinTh = Math.sin(radian)
    const cosTh = Math.cos(radian)

    const coords = this.getCenterPoint()
    const tl = {
      x: coords.x - offsetX,
      y: coords.y - offsetY,
    }
    const tr = {
      x: tl.x + this.currentWidth * cosTh,
      y: tl.y + this.currentWidth * sinTh,
    }
    const br = {
      x: tr.x - this.currentHeight * sinTh,
      y: tr.y + this.currentHeight * cosTh,
    }
    const bl = {
      x: tl.x - this.currentHeight * sinTh,
      y: tl.y + this.currentHeight * cosTh,
    }
    const ml = {
      x: tl.x - (this.currentHeight / 2) * sinTh,
      y: tl.y + (this.currentHeight / 2) * cosTh,
    }
    const mt = {
      x: tl.x + (this.currentWidth / 2) * cosTh,
      y: tl.y + (this.currentWidth / 2) * sinTh,
    }
    const mr = {
      x: tr.x - (this.currentHeight / 2) * sinTh,
      y: tr.y + (this.currentHeight / 2) * cosTh,
    }
    const mb = {
      x: bl.x + (this.currentWidth / 2) * cosTh,
      y: bl.y + (this.currentWidth / 2) * sinTh,
    }
    const mtr = {
      x: tl.x + (this.currentWidth / 2) * cosTh,
      y: tl.y + (this.currentWidth / 2) * sinTh,
    }

    // clockwise
    this.oCoords = { tl, tr, br, bl, ml, mt, mr, mb, mtr }

    // set coordinates of the draggable boxes in the corners used to scale/rotate the image
    this._setCornerCoords()

    return this
  }

  /** 重新设置物体的每个控制点，包括位置和大小 */
  _setCornerCoords() {
    const coords = this.oCoords
    const radian = Util.degreesToRadians(this.angle)
    const newTheta = Util.degreesToRadians(45 - this.angle)
    const cornerHypotenuse = Math.sqrt(2 * this.cornerSize ** 2) / 2
    const cosHalfOffset = cornerHypotenuse * Math.cos(newTheta)
    const sinHalfOffset = cornerHypotenuse * Math.sin(newTheta)
    const sinTh = Math.sin(radian)
    const cosTh = Math.cos(radian)

    coords.tl.corner = {
      tl: {
        x: coords.tl.x - sinHalfOffset,
        y: coords.tl.y - cosHalfOffset,
      },
      tr: {
        x: coords.tl.x + cosHalfOffset,
        y: coords.tl.y - sinHalfOffset,
      },
      bl: {
        x: coords.tl.x - cosHalfOffset,
        y: coords.tl.y + sinHalfOffset,
      },
      br: {
        x: coords.tl.x + sinHalfOffset,
        y: coords.tl.y + cosHalfOffset,
      },
    }

    coords.tr.corner = {
      tl: {
        x: coords.tr.x - sinHalfOffset,
        y: coords.tr.y - cosHalfOffset,
      },
      tr: {
        x: coords.tr.x + cosHalfOffset,
        y: coords.tr.y - sinHalfOffset,
      },
      br: {
        x: coords.tr.x + sinHalfOffset,
        y: coords.tr.y + cosHalfOffset,
      },
      bl: {
        x: coords.tr.x - cosHalfOffset,
        y: coords.tr.y + sinHalfOffset,
      },
    }

    coords.bl.corner = {
      tl: {
        x: coords.bl.x - sinHalfOffset,
        y: coords.bl.y - cosHalfOffset,
      },
      bl: {
        x: coords.bl.x - cosHalfOffset,
        y: coords.bl.y + sinHalfOffset,
      },
      br: {
        x: coords.bl.x + sinHalfOffset,
        y: coords.bl.y + cosHalfOffset,
      },
      tr: {
        x: coords.bl.x + cosHalfOffset,
        y: coords.bl.y - sinHalfOffset,
      },
    }

    coords.br.corner = {
      tr: {
        x: coords.br.x + cosHalfOffset,
        y: coords.br.y - sinHalfOffset,
      },
      bl: {
        x: coords.br.x - cosHalfOffset,
        y: coords.br.y + sinHalfOffset,
      },
      br: {
        x: coords.br.x + sinHalfOffset,
        y: coords.br.y + cosHalfOffset,
      },
      tl: {
        x: coords.br.x - sinHalfOffset,
        y: coords.br.y - cosHalfOffset,
      },
    }

    coords.ml.corner = {
      tl: {
        x: coords.ml.x - sinHalfOffset,
        y: coords.ml.y - cosHalfOffset,
      },
      tr: {
        x: coords.ml.x + cosHalfOffset,
        y: coords.ml.y - sinHalfOffset,
      },
      bl: {
        x: coords.ml.x - cosHalfOffset,
        y: coords.ml.y + sinHalfOffset,
      },
      br: {
        x: coords.ml.x + sinHalfOffset,
        y: coords.ml.y + cosHalfOffset,
      },
    }

    coords.mt.corner = {
      tl: {
        x: coords.mt.x - sinHalfOffset,
        y: coords.mt.y - cosHalfOffset,
      },
      tr: {
        x: coords.mt.x + cosHalfOffset,
        y: coords.mt.y - sinHalfOffset,
      },
      bl: {
        x: coords.mt.x - cosHalfOffset,
        y: coords.mt.y + sinHalfOffset,
      },
      br: {
        x: coords.mt.x + sinHalfOffset,
        y: coords.mt.y + cosHalfOffset,
      },
    }

    coords.mr.corner = {
      tl: {
        x: coords.mr.x - sinHalfOffset,
        y: coords.mr.y - cosHalfOffset,
      },
      tr: {
        x: coords.mr.x + cosHalfOffset,
        y: coords.mr.y - sinHalfOffset,
      },
      bl: {
        x: coords.mr.x - cosHalfOffset,
        y: coords.mr.y + sinHalfOffset,
      },
      br: {
        x: coords.mr.x + sinHalfOffset,
        y: coords.mr.y + cosHalfOffset,
      },
    }

    coords.mb.corner = {
      tl: {
        x: coords.mb.x - sinHalfOffset,
        y: coords.mb.y - cosHalfOffset,
      },
      tr: {
        x: coords.mb.x + cosHalfOffset,
        y: coords.mb.y - sinHalfOffset,
      },
      bl: {
        x: coords.mb.x - cosHalfOffset,
        y: coords.mb.y + sinHalfOffset,
      },
      br: {
        x: coords.mb.x + sinHalfOffset,
        y: coords.mb.y + cosHalfOffset,
      },
    }

    coords.mtr.corner = {
      tl: {
        x: coords.mtr.x - sinHalfOffset + sinTh * this.rotatingPointOffset,
        y: coords.mtr.y - cosHalfOffset - cosTh * this.rotatingPointOffset,
      },
      tr: {
        x: coords.mtr.x + cosHalfOffset + sinTh * this.rotatingPointOffset,
        y: coords.mtr.y - sinHalfOffset - cosTh * this.rotatingPointOffset,
      },
      bl: {
        x: coords.mtr.x - cosHalfOffset + sinTh * this.rotatingPointOffset,
        y: coords.mtr.y + sinHalfOffset - cosTh * this.rotatingPointOffset,
      },
      br: {
        x: coords.mtr.x + sinHalfOffset + sinTh * this.rotatingPointOffset,
        y: coords.mtr.y + cosHalfOffset - cosTh * this.rotatingPointOffset,
      },
    }
  }

  /** 获取包围盒的四条边 */
  _getImageLines(corner: Corner) {
    return {
      topline: {
        o: corner.tl,
        d: corner.tr,
      },
      rightline: {
        o: corner.tr,
        d: corner.br,
      },
      bottomline: {
        o: corner.br,
        d: corner.bl,
      },
      leftline: {
        o: corner.bl,
        d: corner.tl,
      },
    }
  }

  /**
   * 射线检测法：以鼠标坐标点为参照，水平向右做一条射线，求坐标点与多边形的交点个数
   * 如果和物体相交的个数为偶数点则点在物体外部；如果为奇数点则点在内部
   * 在 fabric 中的点选多边形其实就是点选矩形，所以针对矩形做了一些优化
   */
  _findCrossPoints(ex: number, ey: number, lines): number {
    let b1 // 射线的斜率
    let b2 // 边的斜率
    let a1
    let a2
    let xi // 射线与边的交点 x
    // yi, // 射线与边的交点 y
    let xcount = 0
    let iLine // 当前边

    // 遍历包围盒的四条边
    for (const lineKey in lines) {
      iLine = lines[lineKey]

      // 优化1：如果边的两个端点的 y 值都小于鼠标点的 y 值，则跳过
      if (iLine.o.y < ey && iLine.d.y < ey) continue
      // 优化2：如果边的两个端点的 y 值都大于等于鼠标点的 y 值，则跳过
      if (iLine.o.y >= ey && iLine.d.y >= ey) continue

      // 优化3：如果边是一条垂线
      if (iLine.o.x === iLine.d.x && iLine.o.x >= ex) {
        xi = iLine.o.x
        // yi = ey;
      }
      else {
        // 执行到这里就是一条普通斜线段了
        // 用 y=kx+b 简单算下射线与边的交点即可
        b1 = 0
        b2 = (iLine.d.y - iLine.o.y) / (iLine.d.x - iLine.o.x)
        a1 = ey - b1 * ex
        a2 = iLine.o.y - b2 * iLine.o.x

        xi = -(a1 - a2) / (b1 - b2)
        // yi = a1 + b1 * xi;
      }

      // 只需要计数 xi >= ex 的情况
      if (xi >= ex)
        xcount += 1

      // 优化4：因为 fabric 中的点选只需要用到矩形，所以根据矩形的特质，顶多只有两个交点，于是就可以提前结束循环
      if (xcount === 2)
        break
    }

    return xcount
  }
}
