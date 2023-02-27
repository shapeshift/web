import type { ChainKey, LifiError, Token } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'

export async function getUsdRate(
  asset: Asset,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<string> {
  const chainKey = lifiChainMap.get(asset.chainId)

  if (chainKey === undefined) return '0'

  const lifi = getLifi()

  const token: Token = await lifi.getToken(chainKey, asset.symbol).catch((e: LifiError) => {
    throw new SwapError(`[getUsdRate] ${e.message}`, {
      code: SwapErrorType.USD_RATE_FAILED,
    })
  })
  return token.priceUSD ?? '0'
}
