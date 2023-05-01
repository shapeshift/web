import type { ChainKey, LifiError, Token as LifiToken } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getAssetAddress/getAssetAddress'

export async function getUsdRate(
  asset: Asset,
  lifiChainMap: Map<ChainId, ChainKey>,
  lifi: LIFI,
): Promise<Result<string, SwapErrorRight>> {
  const chainKey = lifiChainMap.get(asset.chainId)

  // TODO(gomes): is this really an OK case?
  if (chainKey === undefined) return Ok('0')

  const assetAddress = getEvmAssetAddress(asset)

  const token: Result<LifiToken, SwapErrorRight> = await lifi
    .getToken(chainKey, assetAddress)
    .then(token => Ok(token))
    .catch((e: LifiError) => {
      return Err(
        makeSwapErrorRight({
          message: `[getUsdRate] ${e.message}`,
          code: SwapErrorType.USD_RATE_FAILED,
        }),
      )
    })

  return token.andThen(token => Ok(token.priceUSD ?? '0'))
}
