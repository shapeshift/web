import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { MAX_ZRX_TRADE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import { getUsdRate } from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'

export const getZrxMinMax = async (
  sellAsset: Asset,
  buyAsset: Asset,
): Promise<Result<MinMaxOutput, SwapErrorRight>> => {
  if (
    !(
      isEvmChainId(sellAsset.chainId) &&
      isEvmChainId(buyAsset.chainId) &&
      buyAsset.chainId === sellAsset.chainId
    )
  ) {
    return Err(
      makeSwapErrorRight({ message: '[getZrxMinMax]', code: SwapErrorType.UNSUPPORTED_PAIR }),
    )
  }

  const maybeUsdRate = await getUsdRate({ ...sellAsset })

  return maybeUsdRate.map(usdRate => {
    const minimumAmountCryptoHuman = bn(1).dividedBy(bnOrZero(usdRate)).toString() // $1 worth of the sell token.
    const maximumAmountCryptoHuman = MAX_ZRX_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimumAmountCryptoHuman,
      maximumAmountCryptoHuman,
    }
  })
}
