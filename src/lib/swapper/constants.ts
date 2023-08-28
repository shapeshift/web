import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

import { SwapperName } from './types'
import { makeSwapErrorRight } from './utils'

export const QUOTE_TIMEOUT_MS = 10_000

export const QUOTE_TIMEOUT_ERROR = makeSwapErrorRight({
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})

export const swappers = [
  {
    swapperName: SwapperName.LIFI,
    swapper: { ...lifiSwapper, ...lifiApi },
  },
  {
    swapperName: SwapperName.Thorchain,
    swapper: { ...thorchainSwapper, ...thorchainApi },
  },
  {
    swapperName: SwapperName.Zrx,
    swapper: { ...zrxSwapper, ...zrxApi },
  },
  {
    swapperName: SwapperName.CowSwap,
    swapper: { ...cowSwapper, ...cowApi },
  },
  {
    swapperName: SwapperName.OneInch,
    swapper: { ...oneInchSwapper, ...oneInchApi },
  },
]
