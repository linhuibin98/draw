import type { Offset } from './types/canvas'
import { Point } from './Point'

const PiBy180 = Math.PI / 180 // 写在这里相当于缓存，因为会频繁调用

export class Util {
  /** 单纯的创建一个新的 canvas 元素 */
  static createCanvasElement() {
    const canvas = document.createElement('canvas')
    return canvas
  }

  /**
   * 角度转弧度，注意 canvas 中用的都是弧度，但是角度对我们来说比较直观
   * @params degrees 角度
   * */
  static degreesToRadians(degrees: number): number {
    return degrees * PiBy180
  }

  /**
   * 弧度转角度，注意 canvas 中用的都是弧度，但是角度对我们来说比较直观
   * @params radians 弧度
   * */
  static radiansToDegrees(radians: number): number {
    return radians / PiBy180
  }

  /**
   * 从数组中移除指定的元素，从前往后找到的第一个元素
   * @params array 数组
   * @params value 指定要移除的元素
   *  */
  static removeFromArray(array: any[], value: any) {
    const idx = array.indexOf(value)
    if (idx !== -1) array.splice(idx, 1)

    return array
  }

  static clone(obj: any) {
    if (!obj || typeof obj !== 'object') return obj

    const temp = new obj.constructor()

    for (const key in obj) {
      if (!obj[key] || typeof obj[key] !== 'object') temp[key] = obj[key]
      else temp[key] = Util.clone(obj[key])
    }

    return temp
  }

  static loadImage(url: string, options?: { crossOrigin: string }) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const done = () => {
        img.onload = img.onerror = null
        resolve(img)
      }

      if (url) {
        img.onload = done
        img.onerror = () => {
          reject(new Error(`Error loaded ${img.src}`))
        }
        options
          && options.crossOrigin
          && (img.crossOrigin = options.crossOrigin)
        img.src = url
      }
      else {
        done()
      }
    })
  }

  static addClass(el: HTMLElement, className: string) {
    el.classList.add(className)
  }

  static setStyle(
    el: HTMLElement,
    styles: string | Partial<Record<keyof CSSStyleDeclaration, string | number>>,
  ) {
    if (typeof styles === 'string') {
      el.style.cssText += `;${styles}`
      return styles.includes('opacity')
        ? Util.setOpacity(el, styles.match(/opacity:\s*(\d?\.?\d*)/)?.[1] || '')
        : el
    }

    for (const key in styles) {
      const val = styles[key]!
      el.style[key] = typeof val === 'string' ? val : String(val)
    }

    return el
  }

  static setOpacity(el: HTMLElement, value: string) {
    el.style.opacity = value
    return el
  }

  /** 设置 css 的 userSelect 样式为 none，也就是不可选中的状态 */
  static makeElementUnselectable(element: HTMLElement): HTMLElement {
    element.style.userSelect = 'none'
    return element
  }

  /**
   * 包裹元素并替换
   * */
  static wrapElement(
    element: HTMLElement,
    wrapper: HTMLElement | string,
    attributes,
  ) {
    if (typeof wrapper === 'string')
      wrapper = Util.makeElement(wrapper, attributes)

    if (element.parentNode) element.parentNode.replaceChild(wrapper, element)

    wrapper.appendChild(element)
    return wrapper
  }

  /**
   * 新建元素并添加相应属性
   * @param tagName 标签名
   * @param attributes 样式对象
   */
  static makeElement(tagName: string, attributes) {
    const el = document.createElement(tagName)
    for (const prop in attributes) {
      if (prop === 'class') el.className = attributes[prop]
      else el.setAttribute(prop, attributes[prop])
    }
    return el
  }

  // 一个物体通常是一堆点的集合
  static makeBoundingBoxFromPoints(points: Point[]) {
    const xPoints = points.map(p => p.x)
    const yPoints = points.map(p => p.y)

    const minX = Util.min(xPoints)
    const maxX = Util.max(xPoints)
    const minY = Util.min(yPoints)
    const maxY = Util.max(yPoints)
    const width = Math.abs(maxX - minX)
    const height = Math.abs(maxY - minY)

    return {
      left: minX,
      top: minY,
      width,
      height,
    }
  }

  /**
   * 数组的最小值
   */
  static min(array: any[], byProperty = '') {
    if (!array || array.length === 0) return undefined

    let i = array.length - 1
    let result = byProperty ? array[i][byProperty] : array[i]

    if (byProperty) {
      while (i--)
        if (array[i][byProperty] < result) result = array[i][byProperty]
    }
    else {
      while (i--) if (array[i] < result) result = array[i]
    }
    return result
  }

  /**
   * 数组的最大值
   */
  static max(array: any[], byProperty = '') {
    if (!array || array.length === 0) return undefined

    let i = array.length - 1
    let result = byProperty ? array[i][byProperty] : array[i]
    if (byProperty) {
      while (i--)
        if (array[i][byProperty] >= result) result = array[i][byProperty]
    }
    else {
      while (i--) if (array[i] >= result) result = array[i]
    }
    return result
  }

  /** 计算元素偏移量 */
  static getElementOffset(element): Offset {
    let valueT = 0
    let valueL = 0

    while (element) {
      valueT += element.offsetTop || 0
      valueL += element.offsetLeft || 0
      element = element.offsetParent
    }

    return { left: valueL, top: valueT }
  }

  /**
   * 绑定事件
   */
  static addListener(el, eventName: string, listener) {
    el.addEventListener(eventName, listener, false)
  }

  static removeListener(el, eventName: string, listener) {
    el.removeEventListener(eventName, listener, false)
  }

  /** 获取鼠标的点击坐标，相对于页面左上角，注意不是画布的左上角，到时候会减掉 offset */
  static getPointer(event: Event, upperCanvasEl: HTMLCanvasElement) {
    event || (event = window.event!)

    let element: HTMLElement | Document = event.target as
      | Document
      | HTMLElement
    const body = document.body || { scrollLeft: 0, scrollTop: 0 }
    const docElement = document.documentElement
    const orgElement = element
    let scrollLeft = 0
    let scrollTop = 0
    let firstFixedAncestor

    while (element && element.parentNode && !firstFixedAncestor) {
      element = element.parentNode as Document | HTMLElement
      if (
        element !== document
        && Util.getElementPosition(element as HTMLElement) === 'fixed'
      )
        firstFixedAncestor = element

      if (
        element !== document
        && orgElement !== upperCanvasEl
        && Util.getElementPosition(element as HTMLElement) === 'absolute'
      ) {
        scrollLeft = 0
        scrollTop = 0
      }
      else if (element === document && orgElement !== upperCanvasEl) {
        scrollLeft = body.scrollLeft || docElement.scrollLeft || 0
        scrollTop = body.scrollTop || docElement.scrollTop || 0
      }
      else {
        scrollLeft += (element as HTMLElement).scrollLeft || 0
        scrollTop += (element as HTMLElement).scrollTop || 0
      }
    }

    return {
      x: Util.pointerX(event) + scrollLeft,
      y: Util.pointerY(event) + scrollTop,
    }
  }

  /** 获取元素位置 */
  static getElementPosition(element: HTMLElement) {
    return window.getComputedStyle(element, null).position
  }

  static pointerX(event) {
    return event.clientX || 0
  }

  static pointerY(event) {
    return event.clientY || 0
  }

  /**
   * 将 point 绕 origin 旋转 radians 弧度
   * @param {Point} point 要旋转的点
   * @param {Point} origin 旋转中心点
   * @param {number} radians 注意 canvas 中用的都是弧度
   * @returns
   */
  static rotatePoint(point: Point, origin: Point, radians: number): Point {
    const sin = Math.sin(radians)
    const cos = Math.cos(radians)

    point.subtractEquals(origin)

    const rx = point.x * cos - point.y * sin
    const ry = point.x * sin + point.y * cos

    return new Point(rx, ry).addEquals(origin)
  }
}
