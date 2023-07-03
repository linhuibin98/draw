import type { FabricObject } from '../FabricObject'

export interface Offset {
  top: number
  left: number
}

export interface Pos {
  x: number
  y: number
}

/** 选区的起点和终点，两点构成了一个矩形 */
export interface GroupSelector {
  /** 起始点的坐标 x */
  ex: number
  /** 起始点的坐标 y */
  ey: number
  /** 终点的坐标 x */
  top: number
  /** 终点的坐标 y */
  left: number
}

export interface Transform {
  angle: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  translateX: number
  translateY: number
}

export interface CurrentTransform {
  target: FabricObject
  /** 当前操作：拖拽 | 旋转 | 缩放 | 拉伸 */
  action: string
  currentAction?: string
  /** 物体缩放值 x */
  scaleX: number
  /** 物体缩放值 y */
  scaleY: number
  /** 画布偏移 x */
  offsetX: number
  /** 画布偏移 y */
  offsetY: number
  /** 物体变换基点 originX */
  originX: string
  /** 物体变换基点 originY */
  originY: string
  /** 鼠标点击坐标 ex */
  ex: number
  /** 鼠标点击坐标 ey */
  ey: number
  /** 物体参考中心 left */
  left: number
  /** 物体参考中心 top */
  top: number
  /** 物体旋转弧度 */
  theta: number
  /** 物体宽度，需要乘以缩放值 */
  width: number
  /** x 轴方向拉伸的标志 */
  mouseXSign: number
  /** y 轴方向拉伸的标志 */
  mouseYSign: number
  /** 原始的变换 */
  original?: any
}
