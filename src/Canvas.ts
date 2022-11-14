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
  /** 整个画布到上面和左边的偏移量 */
  private _offset: Offset
  /** 画布中所有添加的物体 */
  private _objects!: FabricObject[]

  constructor(el: HTMLCanvasElement, options: any) {
    // 初始化配置
    this._initOptions(options)
    // 初始化下层画布 lower canvas
    this._initStatic(el)
    // 初始化上层画布
    this._initInteractive()
    // 初始化缓冲层画布
    this._createCacheCanvas()
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
    this._createUpperCanvas()
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
