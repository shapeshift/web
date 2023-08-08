import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import type { ProtocolFee, SwapErrorRight } from 'lib/swapper/api'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getLimit } from 'lib/swapper/swappers/ThorchainSwapper/utils/getLimit/getLimit'
import { makeSwapMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/makeSwapMemo'
import type { PartialRecord } from 'lib/utils'

import type { ThornodeQuoteResponseSuccess } from '../../types'

type GetThorTxInfoArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string | undefined
  xpub: string
  protocolFees: PartialRecord<AssetId, ProtocolFee>
  affiliateBps: string
  buyAssetUsdRate: string
  feeAssetUsdRate: string
  thornodeQuote: ThornodeQuoteResponseSuccess
}
type GetThorTxInfoReturn = Promise<
  Result<
    {
      opReturnData: string
      vault: string
      pubkey: string
    },
    SwapErrorRight
  >
>
type GetThorTxInfo = (args: GetThorTxInfoArgs) => GetThorTxInfoReturn

export const getThorTxInfo: GetThorTxInfo = async ({
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  destinationAddress,
  xpub,
  protocolFees,
  affiliateBps,
  buyAssetUsdRate,
  feeAssetUsdRate,
  thornodeQuote,
}) => {
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybeInboundAddress = await getInboundAddressDataForChain(
    daemonUrl,
    sellAsset.assetId,
    false,
  )

  if (maybeInboundAddress.isErr()) return Err(maybeInboundAddress.unwrapErr())
  const inboundAddress = maybeInboundAddress.unwrap()
  const vault = inboundAddress.address

  const maybeLimit = await getLimit({
    buyAsset,
    sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerance,
    protocolFees,
    buyAssetUsdRate,
    feeAssetUsdRate,
    thornodeQuote,
  })

  return maybeLimit.map(limit => {
    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit,
      affiliateBps,
    })

    return {
      opReturnData: memo,
      vault,
      pubkey: xpub,
    }
  })
}
