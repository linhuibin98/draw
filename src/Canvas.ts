import type { FabricObject } from './FabricObject'
import type { CurrentTransform, GroupSelector, Offset, Pos } from './types/canvas'
import { Util } from './Util'
import { EventCenter } from './EventCenter'
import { Group } from './Group'
import { Point } from './Point'

const STROKE_OFFSET = 0.5
const cursorMap = {
  tr: 'ne-resize',
  br: 'se-resize',
  bl: 'sw-resize',
  tl: 'nw-resize',
  ml: 'w-resize',
  mt: 'n-resize',
  mr: 'e-resize',
  mb: 's-resize',
}

/** 画布类 */
export class Canvas extends EventCenter {
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
  private _offset!: Offset
  /** 画布中所有添加的物体 */
  private _objects: FabricObject[] = []

  /** 当前激活物体 */
  private _activeObject
  /** 当前选中的组 */
  public _activeGroup: Group | null = null
  /** 当前物体的变换信息，src 目录下中有截图 */
  private _currentTransform: CurrentTransform | null = null
  /** 变换之前的中心点方式 */
  // private _previousOriginX;
  private _previousPointer: Pos
  /** 左键拖拽的产生的选择区域，拖蓝区域 */
  private _groupSelector: GroupSelector | null = null

  /** 默认鼠标样式 */
  public defaultCursor = 'default'
  public hoverCursor = 'move'
  public moveCursor = 'move'
  public rotationCursor = 'crosshair'

  constructor(el: HTMLCanvasElement, options: any) {
    super()
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
    for (let i = args.length; i--;) this._initObject(args[i])

    this.renderAll()
    return this
  }

  _initObject(obj: FabricObject) {
    obj.setupState()
    obj.setCoords()
    obj.canvas = this
    this.emit('object:added', { target: obj })
    obj.emit('added')
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
    for (const prop in options) this[prop] = options[prop]

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
    this._initEvents()
    this.calcOffset()
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

  /** 获取画布的偏移量，到时计算鼠标点击位置需要用到 */
  calcOffset(): Canvas {
    this._offset = Util.getElementOffset(this.lowerCanvasEl)
    return this
  }

  /** 给上层画布增加鼠标事件 */
  _initEvents() {
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onResize = this._onResize.bind(this)

    // 首先肯定要添加事件监听啦
    Util.addListener(window, 'resize', this._onResize)
    Util.addListener(this.upperCanvasEl, 'mousedown', this._onMouseDown)
    Util.addListener(this.upperCanvasEl, 'mousemove', this._onMouseMove)
  }

  _onMouseDown(e: MouseEvent) {
    this.__onMouseDown(e)
    Util.addListener(document, 'mouseup', this._onMouseUp)
    Util.addListener(document, 'mousemove', this._onMouseMove)
    Util.removeListener(this.upperCanvasEl, 'mousemove', this._onMouseMove)
  }

  _onMouseMove(e: MouseEvent) {
    // 如果是 hover 事件，我们只需要改变鼠标样式，并不会重新渲染
    const style = this.upperCanvasEl.style
    // findTarget 的过程就是看鼠标有没有 hover 到某个物体上
    const target = this.findTarget(e)
    // 设置鼠标样式
    if (target) this._setCursorFromEvent(e, target)
    else style.cursor = this.defaultCursor
  }

  _onMouseUp(e: MouseEvent) {
    this.__onMouseUp(e)
    Util.removeListener(document, 'mouseup', this._onMouseUp)
    Util.removeListener(document, 'mousemove', this._onMouseMove)
    Util.addListener(this.upperCanvasEl, 'mousemove', this._onMouseMove)
  }

  _onResize() {
    this.calcOffset()
  }

  __onMouseDown(e: MouseEvent) {
    // 只处理左键点击，要么是拖蓝事件、要么是点选事件
    const isLeftClick = 'which' in e ? e.which === 1 : e.button === 1
    if (!isLeftClick) return

    // 这个我猜是为了保险起见，ignore if some object is being transformed at this moment
    if (this._currentTransform) return

    let target = this.findTarget(e)
    const pointer = this.getPointer(e)
    // let corner
    this._previousPointer = pointer

    if (this._shouldClearSelection(e)) {
      // 如果是拖蓝选区事件
      this._groupSelector = {
        // 重置选区状态
        ex: pointer.x,
        ey: pointer.y,
        top: 0,
        left: 0,
      }
      // 让所有元素失去激活状态
      this.deactivateAllWithDispatch()
      // this.renderAll();
    }
    else if (target) {
      // 如果是点选操作，接下来就要为各种变换做准备
      target.saveState()

      // 判断点击的是不是控制点
      // corner = target._findTargetCorner(e, this._offset)
      // if ((corner = target._findTargetCorner(e, this._offset))) {
      //     this.onBeforeScaleRotate(target);
      // }
      if (this._shouldHandleGroupLogic(e, target)) {
        // 如果是选中组
        this._handleGroupLogic(e, target)
        target = this.getActiveGroup()!
      }
      else {
        // 如果是选中单个物体
        if (target !== this.getActiveGroup())
          this.deactivateAll()

        this.setActiveObject(target)
      }
      this._setupCurrentTransform(e, target)

      // if (target) this.renderAll();
    }
    // 不论是拖蓝选区事件还是点选事件，都需要重新绘制
    // 拖蓝选区：需要把之前激活的物体取消选中态
    // 点选事件：需要把当前激活的物体置顶
    this.renderAll()

    this.emit('mouse:down', { target, e })
    target && target.emit('mousedown', { e })
    // if (corner === 'mtr') {
    //     // 如果点击的是上方的控制点，也就是旋转操作，我们需要临时改一下变换中心，因为我们一直就是以 center 为中心，所以可以先不管
    //     this._previousOriginX = this._currentTransform.target.originX;
    //     this._currentTransform.target.adjustPosition('center');
    //     this._currentTransform.left = this._currentTransform.target.left;
    //     this._currentTransform.top = this._currentTransform.target.top;
    // }
  }

  /** 主要就是清空拖蓝选区，设置物体激活状态，重新渲染画布 */
  __onMouseUp(e: MouseEvent) {
    let target
    if (this._currentTransform) {
      const transform = this._currentTransform

      target = transform.target
      if (target._scaling)
        target._scaling = false

      // 每次物体更改都要重新计算新的控制点
      let i = this._objects.length
      while (i--)
        this._objects[i].setCoords()

      target.isMoving = false

      // 在点击之间如果物体状态改变了才派发事件
      if (target.hasStateChanged()) {
        this.emit('object:modified', { target })
        target.emit('modified')
      }

      // if (this._previousOriginX) {
      //     this._currentTransform.target.adjustPosition(this._previousOriginX);
      //     this._previousOriginX = null;
      // }
    }

    this._currentTransform = null

    if (this._groupSelector) {
      // 如果有拖蓝框选区域
      this._findSelectedObjects()
    }
    const activeGroup = this.getActiveGroup()
    if (activeGroup) {
      // 重新设置 激活组 中的物体
      activeGroup.setObjectsCoords()
      activeGroup.set('isMoving', false)
      this._setCursor(this.defaultCursor)
    }

    // clear selection
    this._groupSelector = null
    this.renderAll()

    this._setCursorFromEvent(e, target)

    // fix for FF
    // this._setCursor('');

    // let _this = this;
    // setTimeout(function () {
    //     _this._setCursorFromEvent(e, target);
    // }, 50);

    // if (target) {
    //     const { top, left, currentWidth, currentHeight, width, height, angle, scaleX, scaleY, originX, originY } = target;
    //     const obj = {
    //         top,
    //         left,
    //         currentWidth,
    //         currentHeight,
    //         width,
    //         height,
    //         angle,
    //         scaleX,
    //         scaleY,
    //         originX,
    //         originY,
    //     };
    //     console.log(JSON.stringify(obj, null, 4));
    // }

    this.emit('mouse:up', { target, e })
    target && target.emit('mouseup', { e })
  }

  /** 记录当前物体的变换状态 */
  _setupCurrentTransform(e: MouseEvent, target: FabricObject) {
    let action = 'drag'
    const pointer = Util.getPointer(e, target.canvas.upperCanvasEl)

    const corner = target._findTargetCorner(e, this._offset)
    if (corner) {
      // 根据点击的控制点判断此次操作是什么
      action = corner === 'ml' || corner === 'mr' ? 'scaleX' : corner === 'mt' || corner === 'mb' ? 'scaleY' : corner === 'mtr' ? 'rotate' : 'scale'
    }

    let originX = 'center'
    let originY = 'center'

    if (corner === 'ml' || corner === 'tl' || corner === 'bl') {
      // 如果点击的是左边的控制点，则变换基点就是右边，以右边为基准向左变换
      originX = 'right'
    }
    else if (corner === 'mr' || corner === 'tr' || corner === 'br') {
      originX = 'left'
    }

    if (corner === 'tl' || corner === 'mt' || corner === 'tr') {
      // 如果点击的是上方的控制点，则变换基点就是底部，以底边为基准向上变换
      originY = 'bottom'
    }
    else if (corner === 'bl' || corner === 'mb' || corner === 'br') {
      originY = 'top'
    }

    if (corner === 'mtr') {
      // 如果是旋转操作，则基点就是中心点
      originX = 'center'
      originY = 'center'
    }

    // let center = target.getCenterPoint();
    this._currentTransform = {
      target,
      action,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      offsetX: pointer.x - target.left,
      offsetY: pointer.y - target.top,
      originX,
      originY,
      ex: pointer.x,
      ey: pointer.y,
      left: target.left,
      top: target.top,
      theta: Util.degreesToRadians(target.angle),
      width: target.width * target.scaleX,
      mouseXSign: 1,
      mouseYSign: 1,
    }
    // 记录物体原始的 original 变换参数
    this._currentTransform.original = {
      left: target.left,
      top: target.top,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      originX,
      originY,
    }
    const { target: target2, ...other } = this._currentTransform
    console.log(JSON.stringify(other, null, 4), target2)

    // this._resetCurrentTransform(e); // 好像没必要重新赋值？除非按下了 altKey 键
  }

  _handleGroupLogic(e, target) {
    if (target === this.getActiveGroup()) {
      // if it's a group, find target again, this time skipping group
      target = this.findTarget(e, true)
      // if even object is not found, bail out
      if (!target || target.isType('group'))
        return
    }
    let activeGroup = this.getActiveGroup()
    if (activeGroup) {
      if (activeGroup.contains(target)) {
        activeGroup.removeWithUpdate(target)
        this._resetObjectTransform(activeGroup)
        target.setActive(false)
        if (activeGroup.size() === 1) {
          // remove group alltogether if after removal it only contains 1 object
          this.discardActiveGroup()
        }
      }
      else {
        activeGroup.addWithUpdate(target)
        this._resetObjectTransform(activeGroup)
      }
      // this.emit('selection:created', { target: activeGroup, e: e });
      activeGroup.setActive(true)
    }
    else {
      // group does not exist
      if (this._activeObject) {
        // only if there's an active object
        if (target !== this._activeObject) {
          // and that object is not the actual target
          const group = new Group([this._activeObject, target])
          this.setActiveGroup(group)
          activeGroup = this.getActiveGroup()
        }
      }
      // activate target object in any case
      target.setActive(true)
    }
    // if (activeGroup) {
    //     activeGroup.saveCoords();
    // }
  }

  /**
     * 获取拖蓝选区包围的元素
     * 可能只有一个物体，那就是普通的点选
     * 如果有多个物体，那就生成一个组
     */
  _findSelectedObjects() {
    const objects: FabricObject[] = [] // 存储最终框选的元素
    const x1 = this._groupSelector!.ex
    const y1 = this._groupSelector!.ey
    const x2 = x1 + this._groupSelector!.left
    const y2 = y1 + this._groupSelector!.top
    const selectionX1Y1 = new Point(Math.min(x1, x2), Math.min(y1, y2))
    const selectionX2Y2 = new Point(Math.max(x1, x2), Math.max(y1, y2))

    for (let i = 0, len = this._objects.length; i < len; ++i) {
      const currentObject = this._objects[i]

      if (!currentObject) continue

      // 物体是否与拖蓝选区相交或者被选区包含
      if (currentObject.intersectsWithRect(selectionX1Y1, selectionX2Y2) || currentObject.isContainedWithinRect(selectionX1Y1, selectionX2Y2)) {
        currentObject.setActive(true)
        objects.push(currentObject)
      }
    }

    if (objects.length === 1) {
      this.setActiveObject(objects[0])
    }
    else if (objects.length > 1) {
      const newGroup = new Group(objects)
      this.setActiveGroup(newGroup)
      // newGroup.saveCoords();
      // this.emit('selection:created', { target: newGroup });
    }

    this.renderAll()
  }

  setActiveObject(object: FabricObject): Canvas {
    if (this._activeObject) {
      // 如果当前有激活物体
      this._activeObject.setActive(false)
    }
    this._activeObject = object
    object.setActive(true)

    this.renderAll()

    // this.emit('object:selected', { target: object, e });
    // object.emit('selected', { e });
    return this
  }

  _resetObjectTransform(target) {
    target.scaleX = 1
    target.scaleY = 1
    target.setAngle(0)
  }

  /** 使所有元素失活，并触发相应事件 */
  deactivateAllWithDispatch(): Canvas {
    // let activeObject = this.getActiveGroup() || this.getActiveObject();
    // if (activeObject) {
    //     this.emit('before:selection:cleared', { target: activeObject });
    // }
    this.deactivateAll()
    // if (activeObject) {
    //     this.emit('selection:cleared');
    // }
    return this
  }

  /** 将所有物体设置成未激活态 */
  deactivateAll() {
    const allObjects = this._objects
    let i = 0
    const len = allObjects.length
    for (; i < len; i++)
      allObjects[i].setActive(false)

    this.discardActiveGroup()
    this.discardActiveObject()
    return this
  }

  /** 将当前选中组失活 */
  discardActiveGroup(): Canvas {
    const g = this.getActiveGroup()
    if (g) g.destroy()
    return this.setActiveGroup(null)
  }

  /** 清空所有激活物体 */
  discardActiveObject() {
    if (this._activeObject)
      this._activeObject.setActive(false)

    this._activeObject = null
    return this
  }

  /** 是否是拖蓝事件，也就是没有点选到物体 */
  _shouldClearSelection(e: MouseEvent) {
    const target = this.findTarget(e)
    const activeGroup = this.getActiveGroup()
    return !target || (target && activeGroup && !activeGroup.contains(target) && activeGroup !== target && !e.shiftKey)
  }

  /** 是否要处理组的逻辑 */
  _shouldHandleGroupLogic(e: MouseEvent, target: FabricObject) {
    const activeObject = this._activeObject
    return e.shiftKey && (this.getActiveGroup() || (activeObject && activeObject !== target))
  }

  setActiveGroup(group: Group | null): Canvas {
    this._activeGroup = group
    if (group) {
      group.canvas = this
      group.setActive(true)
    }
    return this
  }

  /** 设置鼠标样式 */
  _setCursor(value: string) {
    this.upperCanvasEl.style.cursor = value
  }

  /** 根据鼠标位置来设置相应的鼠标样式 */
  _setCursorFromEvent(e: MouseEvent, target: FabricObject): boolean {
    const s = this.upperCanvasEl.style
    if (target) {
      const activeGroup = this.getActiveGroup()
      let corner
        = (!activeGroup || !activeGroup.contains(target))
        && target._findTargetCorner(e, this._offset)

      if (corner) {
        corner = corner as string
        if (corner in cursorMap) {
          s.cursor = cursorMap[corner]
        }
        else if (corner === 'mtr' && target.hasRotatingPoint) {
          s.cursor = this.rotationCursor
        }
        else {
          s.cursor = this.defaultCursor
          return false
        }
      }
      else {
        s.cursor = this.hoverCursor
      }
      return true
    }
    else {
      s.cursor = this.defaultCursor
      return false
    }
  }

  getActiveGroup() {
    return this._activeGroup
  }

  /** 检测是否有物体在鼠标位置 */
  findTarget(e: MouseEvent, skipGroup = false): FabricObject | void {
    let target
    // let pointer = this.getPointer(e);

    // 优先考虑当前组中的物体，因为激活的物体被选中的概率大
    const activeGroup = this.getActiveGroup()
    if (activeGroup && !skipGroup && this.containsPoint(e, activeGroup)) {
      target = activeGroup
      return target
    }

    // 从后往前遍历所有物体，判断鼠标点是否在物体包围盒内
    for (let i = this._objects.length; i--;) {
      const object = this._objects[i]
      if (object && this.containsPoint(e, object)) {
        target = object
        break
      }
    }

    // 如果不根据包围盒来判断，而是根据透明度的话，可以用下面的代码
    // 先通过包围盒找出可能点选的物体，再通过透明度具体判断，具体思路可参考 _isTargetTransparent 方法
    // let possibleTargets = [];
    // for (let i = this._objects.length; i--; ) {
    //     if (this._objects[i] && this.containsPoint(e, this._objects[i])) {
    //         if (this.perPixelTargetFind || this._objects[i].perPixelTargetFind) {
    //             possibleTargets[possibleTargets.length] = this._objects[i];
    //         } else {
    //             target = this._objects[i];
    //             this.relatedTarget = target;
    //             break;
    //         }
    //         break;
    //     }
    // }
    // for (let j = 0, len = possibleTargets.length; j < len; j++) {
    //     pointer = this.getPointer(e);
    //     let isTransparent = this._isTargetTransparent(possibleTargets[j], pointer.x, pointer.y);
    //     if (!isTransparent) {
    //         target = possibleTargets[j];
    //         this.relatedTarget = target;
    //         break;
    //     }
    // }

    if (target) return target
  }

  /**
   * 用缓冲层判断物体是否透明，目前默认都是不透明，可以加一些参数属性，比如允许有几个像素的误差
   * @param {FabricObject} target 物体
   * @param {number} x 鼠标的 x 值
   * @param {number} y 鼠标的 y 值
   * @param {number} tolerance 允许鼠标的误差范围
   * @returns
   */
  _isTargetTransparent(
    target: FabricObject,
    x: number,
    y: number,
    tolerance = 0,
  ): boolean {
    // 1、在缓冲层绘制物体
    // 2、通过 getImageData 获取鼠标位置的像素数据信息
    // 3、遍历像素数据，如果找到一个 rgba 中的 a 的值 > 0 就说明至少有一个颜色，亦即不透明，退出循环
    // 4、清空 getImageData 变量，并清除缓冲层画布
    const cacheContext = this.contextCache
    this._draw(cacheContext, target)

    if (tolerance > 0) { // 如果允许误差
      if (x > tolerance)
        x -= tolerance

      else
        x = 0

      if (y > tolerance)
        y -= tolerance

      else
        y = 0
    }

    let isTransparent = true
    const imageData = cacheContext.getImageData(x, y, tolerance * 2 || 1, tolerance * 2 || 1)

    for (let i = 3; i < imageData.data.length; i += 4) { // 只要看第四项透明度即可
      const temp = imageData.data[i]
      isTransparent = temp <= 0
      if (isTransparent === false) break // 找到一个颜色就停止
    }

    // imageData = null
    this.clearContext(cacheContext)
    return isTransparent
  }

  _draw(ctx: CanvasRenderingContext2D, object: FabricObject) {
    if (!object) return
    object.render(ctx)
  }

  /**
   * 包含点
   */
  containsPoint(e: MouseEvent, target: FabricObject): boolean {
    const pointer = this.getPointer(e)
    const { x, y } = pointer
    // const xy = this._normalizePointer(target, pointer)
    // const x = xy.x
    // const y = xy.y

    // 下面这是参考文献
    // http://www.geog.ubc.ca/courses/klink/gis.notes/ncgia/u32.html
    // http://idav.ucdavis.edu/~okreylos/TAship/Spring2000/PointInPolygon.html

    // we iterate through each object. If target found, return it.
    const iLines = target._getImageLines(target.oCoords)
    const xpoints = target._findCrossPoints(x, y, iLines)

    // if xcount is odd then we clicked inside the object
    // For the specific case of square images xcount === 1 in all true cases
    if (
      (xpoints && xpoints % 2 === 1)
      || target._findTargetCorner(e, this._offset)
    )
      return true
    return false
  }

  /** 如果当前的物体在当前的组内，则要考虑扣去组的 top、left 值 */
  // _normalizePointer(object: FabricObject, pointer: Pos) {
  //   const activeGroup = this.getActiveGroup()
  //   let x = pointer.x
  //   let y = pointer.y

  //   const isObjectInGroup = activeGroup && object.type !== 'group' && activeGroup.contains(object)

  //   if (isObjectInGroup) {
  //     x -= activeGroup.left
  //     y -= activeGroup.top
  //   }
  //   return { x, y }
  // }

  /**
   * 获取鼠标坐标在画布的偏移量
   */
  getPointer(e: MouseEvent): Pos {
    const pointer = Util.getPointer(e, this.upperCanvasEl)
    return {
      x: pointer.x - this._offset.left,
      y: pointer.y - this._offset.top,
    }
  }
}
