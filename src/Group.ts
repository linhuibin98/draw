import { FabricObject } from './FabricObject'
import { Util } from './Util'

/**
 * 组类，也就是拖蓝框选区域包围的那些物体构成了一个组
 * Group 虽然继承至 FabricObject，但是要注意获取某些属性有时是没有的
 */
export class Group extends FabricObject {
  public type = 'group'
  // 组中所有的物体
  public objects: FabricObject[]
  public originalState
  constructor(objects: FabricObject[], options: any = {}) {
    super(options)

    this.objects = objects || []
    this.originalState = {}

    this._calcBounds()
    this._updateObjectsCoords()

    this.setCoords()
  }

  /** 更新所有物体坐标系 */
  _updateObjectsCoords() {
    const groupDeltaX = this.left
    const groupDeltaY = this.top

    this.objects.forEach((object) => {
      const objectLeft = object.get('left')
      const objectTop = object.get('top')

      object.set('left', objectLeft - groupDeltaX)
      object.set('top', objectTop - groupDeltaY)

      object.setCoords()

      // 当有选中组的时候，不显示物体的控制点
      object.orignHasControls = object.hasControls
      object.hasControls = false
    })
  }

  getObjects(): FabricObject[] {
    return this.objects
  }

  /** 将物体添加到 group 中，并重新计算位置尺寸等 */
  addWithUpdate(object: FabricObject): Group {
    this._restoreObjectsState()
    this.objects.push(object)
    this._calcBounds()
    this._updateObjectsCoords()
    return this
  }

  /** 将物体添加到 group 中 */
  add(object: FabricObject) {
    this.objects.push(object)
    return this
  }

  /** 将物体从 group 中移除 */
  remove(object: FabricObject) {
    Util.removeFromArray(this.objects, object)
    return this
  }

  /** 将物体从组中移除，并重新计算组的大小位置 */
  removeWithUpdate(object: FabricObject) {
    this._restoreObjectsState()
    Util.removeFromArray(this.objects, object)
    object.setActive(false)
    this._calcBounds()
    this._updateObjectsCoords()
    return this
  }

  /** 物体是否在 group 中 */
  contains(object: FabricObject) {
    return this.objects.includes(object)
  }

  /** 获取 group 尺寸 */
  size() {
    return this.getObjects().length
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    this.transform(ctx)

    // let groupScaleFactor = Math.max(this.scaleX, this.scaleY);

    for (let i = 0, len = this.objects.length; i < len; i++) {
      const object = this.objects[i]
      // originalScaleFactor = object.borderScaleFactor,
      const originalHasRotatingPoint = object.hasRotatingPoint

      // object.borderScaleFactor = groupScaleFactor;
      object.hasRotatingPoint = false

      object.render(ctx)

      // object.borderScaleFactor = originalScaleFactor;
      object.hasRotatingPoint = originalHasRotatingPoint
    }

    if (this.active) {
      // if (!noTransform && this.active) {
      this.drawBorders(ctx)
      this.drawControls(ctx)
    }
    ctx.restore()
    this.setCoords()
  }

  /** 根据 index 获取 group 中的某个物体 */
  item(index: number): FabricObject {
    return this.getObjects()[index]
  }

  /** 还原创建 group 之前的状态 */
  _restoreObjectsState(): Group {
    this.objects.forEach(this._restoreObjectState, this)
    return this
  }

  /** 还原 group 中某个物体的初始状态 */
  _restoreObjectState(object): Group {
    const groupLeft = this.get('left')
    const groupTop = this.get('top')
    const groupAngle = this.getAngle() * (Math.PI / 180)
    const rotatedTop = Math.cos(groupAngle) * object.get('top') + Math.sin(groupAngle) * object.get('left')
    const rotatedLeft = -Math.sin(groupAngle) * object.get('top') + Math.cos(groupAngle) * object.get('left')

    object.setAngle(object.getAngle() + this.getAngle())

    object.set('left', groupLeft + rotatedLeft * this.get('scaleX'))
    object.set('top', groupTop + rotatedTop * this.get('scaleY'))

    object.set('scaleX', object.get('scaleX') * this.get('scaleX'))
    object.set('scaleY', object.get('scaleY') * this.get('scaleY'))

    object.setCoords()
    object.hasControls = object.orignHasControls
    // delete object.__origHasControls;
    object.setActive(false)
    object.setCoords()

    return this
  }

  destroy() {
    return this._restoreObjectsState()
  }

  /** 重新设置当前组中所有的物体的边框、控制点、位置和大小等 */
  setObjectsCoords(): Group {
    this.objects.forEach((object) => {
      object.setCoords()
    })
    return this
  }

  /** 激活所有 group 中的物体 */
  activateAllObjects(): Group {
    this.objects.forEach((object) => {
      object.setActive(true)
    })
    return this
  }

  /** 计算组的包围盒 */
  _calcBounds() {
    const aX: any[] = []
    const aY: any[] = []
    let o
    let i = 0
    const len = this.objects.length

    for (; i < len; ++i) {
      o = this.objects[i]
      o.setCoords()
      for (const prop in o.oCoords) {
        aX.push(o.oCoords[prop].x)
        aY.push(o.oCoords[prop].y)
      }
    }

    const minX = Util.min(aX)
    const maxX = Util.max(aX)
    const minY = Util.min(aY)
    const maxY = Util.max(aY)

    const width = maxX - minX || 0
    const height = maxY - minY || 0

    this.width = width
    this.height = height

    this.left = minX + width / 2 || 0
    this.top = minY + height / 2 || 0
  }

  /** 检查点是都在 group 中 */
  containsPoint(point) {
    const halfWidth = this.get('width') / 2
    const halfHeight = this.get('height') / 2
    const centerX = this.get('left')
    const centerY = this.get('top')

    return centerX - halfWidth < point.x && centerX + halfWidth > point.x && centerY - halfHeight < point.y && centerY + halfHeight > point.y
  }

  get(prop) {
    // 组里面有很多元素，所以虽然继承至 Fabric，但是有很多属性读取是无效的，设置同理
    return this[prop]
  }

  _set(key: string, value): Group {
    this[key] = value
    return this
  }

  /** 异步标识，说明这个东西是后面创建的，比如得现有几个物体才能有 Group；类似的还有图片，目前这里没用到 */
  static async = true
}