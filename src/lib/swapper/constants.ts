import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper2'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper2'
import { osmosisApi } from 'lib/swapper/swappers/OsmosisSwapper/endpoints'
import { osmosisSwapper } from 'lib/swapper/swappers/OsmosisSwapper/OsmosisSwapper2'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'

import { makeSwapErrorRight, SwapperName } from './api'

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
  {
    swapperName: SwapperName.Osmosis,
    swapper: { ...osmosisSwapper, ...osmosisApi },
  },
]
