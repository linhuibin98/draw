import { Canvas } from './Canvas'
import { FabricObject } from './FabricObject'

import { Util } from './Util'

// 最终导出的东西都挂载到 fabric 上面
export class fabric {
  static Canvas = Canvas
  static FabricObject = FabricObject

  static Util = Util
}
