import { Asset } from '@shapeshiftoss/asset-service'

import { SwapError, SwapErrorType } from '../../../../api'
import type { ThorchainSwapperDeps } from '../../types'
import { getInboundAddressDataForChain } from '../../utils/getInboundAddressDataForChain'
import { getLimit } from '../../utils/getLimit/getLimit'
import { makeSwapMemo } from '../../utils/makeSwapMemo/makeSwapMemo'

type GetThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string
  xpub: string
  buyAssetTradeFeeUsd: string
}
type GetThorTxInfoReturn = Promise<{
  opReturnData: string
  vault: string
  pubkey: string
}>
type GetThorTxInfo = (args: GetThorTxInfoArgs) => GetThorTxInfoReturn

export const getThorTxInfo: GetThorTxInfo = async ({
  deps,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  destinationAddress,
  xpub,
  buyAssetTradeFeeUsd,
}) => {
  try {
    const inboundAddress = await getInboundAddressDataForChain(
      deps.daemonUrl,
      sellAsset.assetId,
      false,
    )
    const vault = inboundAddress?.address

    if (!vault)
      throw new SwapError(`[getThorTxInfo]: vault not found for asset`, {
        code: SwapErrorType.RESPONSE_ERROR,
        details: { inboundAddress, sellAsset },
      })

    const limit = await getLimit({
      buyAssetId: buyAsset.assetId,
      sellAmountCryptoBaseUnit,
      sellAsset,
      slippageTolerance,
      deps,
      buyAssetTradeFeeUsd,
    })

    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit,
    })

    return {
      opReturnData: memo,
      vault,
      pubkey: xpub,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorType.TRADE_QUOTE_FAILED })
  }
}
