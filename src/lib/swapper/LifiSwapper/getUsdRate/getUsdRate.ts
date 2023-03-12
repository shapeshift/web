import type { ChainKey, LifiError, Token as LifiToken } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'

export async function getUsdRate(
  asset: Asset,
  lifiAssetMap: Map<AssetId, LifiToken>,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<string> {
  const chainKey = lifiChainMap.get(asset.chainId)

  if (chainKey === undefined) return '0'

  const lifi = getLifi()

  const lifiAsset = lifiAssetMap.get(asset.assetId)

  if (lifiAsset === undefined) {
    throw new SwapError('[getUsdRate] unsupported asset', {
      code: SwapErrorType.USD_RATE_FAILED,
      details: { asset },
    })
  }

  const token: LifiToken = await lifi
    .getToken(chainKey, lifiAsset.address)
    .catch((e: LifiError) => {
      throw new SwapError(`[getUsdRate] ${e.message}`, {
        code: SwapErrorType.USD_RATE_FAILED,
      })
    })
  return token.priceUSD ?? '0'
}
