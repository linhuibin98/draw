import { Util } from './Util'

/** 物体基类 */
export class FabricObject {
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
    // 状态回退
    ctx.restore()
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
}
