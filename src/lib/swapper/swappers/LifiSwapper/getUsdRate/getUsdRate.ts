import type { ChainKey, LifiError, Token as LifiToken } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { getEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getAssetAddress/getAssetAddress'

export async function getUsdRate(
  asset: Asset,
  lifiChainMap: Map<ChainId, ChainKey>,
  lifi: LIFI,
): Promise<string> {
  const chainKey = lifiChainMap.get(asset.chainId)

  if (chainKey === undefined) return '0'

  const assetAddress = getEvmAssetAddress(asset)

  const token: LifiToken = await lifi.getToken(chainKey, assetAddress).catch((e: LifiError) => {
    throw new SwapError(`[getUsdRate] ${e.message}`, {
      code: SwapErrorType.USD_RATE_FAILED,
    })
  })

  return token.priceUSD ?? '0'
}
