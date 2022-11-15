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
    if (idx !== -1)
      array.splice(idx, 1)

    return array
  }

  static clone(obj: any) {
    if (!obj || typeof obj !== 'object')
      return obj

    const temp = new obj.constructor()

    for (const key in obj) {
      if (!obj[key] || typeof obj[key] !== 'object')
        temp[key] = obj[key]

      else
        temp[key] = Util.clone(obj[key])
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
        options && options.crossOrigin && (img.crossOrigin = options.crossOrigin)
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

  static setStyle(el: HTMLElement, styles: string | Partial<Record<keyof CSSStyleDeclaration, string | number>>) {
    if (typeof styles === 'string') {
      el.style.cssText += `;${styles}`
      return styles.includes('opacity') ? Util.setOpacity(el, styles.match(/opacity:\s*(\d?\.?\d*)/)?.[1] || '') : el
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
  static wrapElement(element: HTMLElement, wrapper: HTMLElement | string, attributes) {
    if (typeof wrapper === 'string')
      wrapper = Util.makeElement(wrapper, attributes)

    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element)

    wrapper.appendChild(element)
    return wrapper
  }

  /** 新建元素并添加相应属性 */
  static makeElement(tagName: string, attributes) {
    const el = document.createElement(tagName)
    for (const prop in attributes) {
      if (prop === 'class')
        el.className = attributes[prop]

      else
        el.setAttribute(prop, attributes[prop])
    }
    return el
  }
}
