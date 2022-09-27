import { Asset } from '@shapeshiftoss/asset-service'

import { SwapError, SwapErrorTypes } from '../../../../../api'
import { InboundResponse, ThorchainSwapperDeps } from '../../../types'
import { getLimit } from '../../getLimit/getLimit'
import { makeSwapMemo } from '../../makeSwapMemo/makeSwapMemo'
import { thorService } from '../../thorService'

type GetBtcThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  slippageTolerance: string
  destinationAddress: string
  xpub: string
  tradeFee: string
}
type GetBtcThorTxInfoReturn = Promise<{
  opReturnData: string
  vault: string
  pubkey: string
}>
type GetBtcThorTxInfo = (args: GetBtcThorTxInfoArgs) => GetBtcThorTxInfoReturn

export const getThorTxInfo: GetBtcThorTxInfo = async ({
  deps,
  sellAsset,
  buyAsset,
  sellAmount,
  slippageTolerance,
  destinationAddress,
  xpub,
  tradeFee,
}) => {
  try {
    const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
      `${deps.daemonUrl}/lcd/thorchain/inbound_addresses`,
    )

    const sellAssetInboundAddresses = inboundAddresses.find(
      (inbound) => inbound.chain === sellAsset.symbol.toUpperCase(),
    )

    const vault = sellAssetInboundAddresses?.address

    if (!vault)
      throw new SwapError(`[getThorTxInfo]: vault not found for asset`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { inboundAddresses, sellAsset },
      })

    const limit = await getLimit({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      sellAmount,
      sellAsset,
      buyAsset,
      slippageTolerance,
      deps,
      tradeFee,
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
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
