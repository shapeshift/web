import { Swapper, SwapperType } from '../../api'

export class ZrxSwapper implements Swapper {
  getType() {
    return SwapperType.Zrx
  }
}
