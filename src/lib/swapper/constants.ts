import type { Swapper, SwapperApi } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, SwapperName } from '@shapeshiftoss/swapper'
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

export const QUOTE_TIMEOUT_MS = 60_000

export const QUOTE_TIMEOUT_ERROR = makeSwapErrorRight({
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})

// PartialRecord not used to ensure exhaustiveness
export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  [SwapperName.LIFI]: { ...lifiSwapper, ...lifiApi },
  [SwapperName.Thorchain]: { ...thorchainSwapper, ...thorchainApi },
  [SwapperName.Zrx]: { ...zrxSwapper, ...zrxApi },
  [SwapperName.CowSwap]: { ...cowSwapper, ...cowApi },
  [SwapperName.OneInch]: { ...oneInchSwapper, ...oneInchApi },
  [SwapperName.Test]: undefined,
}
