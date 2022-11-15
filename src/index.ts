import { Canvas } from './Canvas'
import { FabricObject } from './FabricObject'
import { Rect } from './Rect'

import { Util } from './Util'

// 最终导出的东西都挂载到 fabric 上面
class fabric {
  static Canvas = Canvas
  static FabricObject = FabricObject
  static Rect = Rect
  static Util = Util
}

export {
  fabric,
  fabric as default,
}
