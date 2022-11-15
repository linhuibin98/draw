import type { FabricObject } from './FabricObject'
import type { Offset } from './types/canvas'
import { Util } from './Util'

/** 画布类 */
export class Canvas {
  /** 画布宽度 */
  public width!: number
  /** 画布高度 */
  public height!: number
  /** 包裹 canvas 的外层 div 容器 */
  public wrapperEl!: HTMLElement
  /** 下层 canvas 画布，主要用于绘制所有物体 */
  public lowerCanvasEl!: HTMLCanvasElement
  /** 上层 canvas，主要用于监听鼠标事件、涂鸦模式、左键点击选中、拖拽蓝框选区域 */
  public upperCanvasEl!: HTMLCanvasElement
  /** 缓冲层画布 */
  public cacheCanvasEl!: HTMLCanvasElement
  /** 上层画布环境 */
  public contextTop!: CanvasRenderingContext2D
  /** 下层画布环境 */
  public contextContainer!: CanvasRenderingContext2D
  /** 缓冲层画布环境 */
  public contextCache!: CanvasRenderingContext2D
  /** 画布包裹的 div 默认类名 */
  public containerClass = 'canvas-container'
  /** 整个画布到上面和左边的偏移量 */
  private _offset: Offset
  /** 画布中所有添加的物体 */
  private _objects: FabricObject[] = []

  constructor(el: HTMLCanvasElement, options: any) {
    // 初始化下层画布 lower canvas
    this._initStatic(el)
    // 初始化配置
    this._initOptions(options)
    // 初始化上层画布
    this._initInteractive()
    // 初始化缓冲层画布
    this._createCacheCanvas()
  }

  /**
     * 添加元素
     * 目前的模式是调用 add 添加物体的时候就立马渲染，如果一次性加入大量元素，就会做很多无用功
     * 所以可以优化一下，就是先批量添加元素（需要加一个变量标识），最后再统一渲染（手动调用 renderAll 函数即可），这里先了解即可
    */
  add(...args): Canvas {
    this._objects.push(...args)
    this.renderAll()
    return this
  }

  /** 在下层画布上绘制所有物体 */
  renderAll(): Canvas {
  // 获取下层画布
    const ctx = this.contextContainer
    // 清除画布
    this.clearContext(ctx)
    // 简单粗暴的遍历渲染
    this._objects.forEach((object) => {
      // render = transfrom + _render
      object.render(ctx)
    })
    return this
  }

  clearContext(ctx: CanvasRenderingContext2D): Canvas {
    ctx && ctx.clearRect(0, 0, this.width, this.height)
    return this
  }

  /** 初始化配置 */
  _initOptions(options: any) {
    for (const prop in options)
      this[prop] = options[prop]

    this.width = +this.lowerCanvasEl.width || 0
    this.height = +this.lowerCanvasEl.height || 0
    this.lowerCanvasEl.style.width = `${this.width}px`
    this.lowerCanvasEl.style.height = `${this.height}px`
  }

  /** 下层画布初始化：参数赋值、重置宽高，并赋予样式 */
  _initStatic(el: HTMLCanvasElement) {
    this._createLowerCanvas(el)
  }

  /** 初始化上层画布 -> 交互层，也就是 upper-canvas */
  _initInteractive() {
    this._initWrapperElement()
    this._createUpperCanvas()
  }

  /** 因为我们用了两个 canvas，所以在 canvas 的外面再多包一个 div 容器 */
  _initWrapperElement() {
    this.wrapperEl = Util.wrapElement(this.lowerCanvasEl, 'div', {
      class: this.containerClass,
    })

    Util.setStyle(this.wrapperEl, {
      width: `${this.width}px`,
      height: `${this.height}px`,
      position: 'relative',
    })

    Util.makeElementUnselectable(this.wrapperEl)
  }

  /** 创建下层画布 */
  _createLowerCanvas(el: HTMLCanvasElement) {
    this.lowerCanvasEl = el
    Util.addClass(this.lowerCanvasEl, 'lower-canvas')
    this._applyCanvasStyle(this.lowerCanvasEl)
    this.contextContainer = this.lowerCanvasEl.getContext('2d')!
  }

  /** 创建上层画布 */
  _createUpperCanvas() {
    this.upperCanvasEl = Util.createCanvasElement()
    this.upperCanvasEl.className = 'upper-canvas'
    this.wrapperEl.appendChild(this.upperCanvasEl)
    this._applyCanvasStyle(this.upperCanvasEl)
    this.contextTop = this.upperCanvasEl.getContext('2d')!
  }

  /** 创建缓冲层画布 */
  _createCacheCanvas() {
    this.cacheCanvasEl = Util.createCanvasElement()
    this.cacheCanvasEl.width = this.width
    this.cacheCanvasEl.height = this.height
    this.contextCache = this.cacheCanvasEl.getContext('2d')!
  }

  _applyCanvasStyle(el: HTMLCanvasElement) {
    const width = this.width || el.width
    const height = this.height || el.height
    Util.setStyle(el, {
      position: 'absolute',
      width: `${width}px`,
      height: `${height}px`,
      left: 0,
      top: 0,
    })
    el.width = width
    el.height = height
  }
}
