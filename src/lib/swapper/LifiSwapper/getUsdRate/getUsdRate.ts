import type { ChainKey, LifiError, Token } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import { fromChainId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'

export async function getUsdRate(
  asset: Asset,
  chainMap: Map<number, ChainKey>,
  tokenMap: Map<string, Pick<Token, 'decimals' | 'symbol'>>,
  lifi: LIFI,
): Promise<string> {
  const chainKey = chainMap.get(+fromChainId(asset.chainId).chainReference)
  const tokenSymbol = tokenMap.get(asset.symbol)?.symbol

  if (chainKey === undefined || tokenSymbol === undefined) return '0'

  const token: Token = await lifi.getToken(chainKey, tokenSymbol).catch((e: LifiError) => {
    throw new SwapError(`[getUsdRate] ${e.message}`, {
      code: SwapErrorType.USD_RATE_FAILED,
    })
  })
  return token.priceUSD ?? '0'
}
