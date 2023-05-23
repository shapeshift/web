import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { ProtocolFee, SwapErrorRight } from 'lib/swapper/api'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getLimit } from 'lib/swapper/swappers/ThorchainSwapper/utils/getLimit/getLimit'
import { makeSwapMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/makeSwapMemo'

type GetThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string | undefined
  xpub: string
  protocolFees: Record<AssetId, ProtocolFee>
  affiliateBps: string
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
  deps,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  destinationAddress,
  xpub,
  protocolFees,
  affiliateBps,
}) => {
  const maybeInboundAddress = await getInboundAddressDataForChain(
    deps.daemonUrl,
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
    deps,
    protocolFees,
    receiveAddress: destinationAddress,
    affiliateBps,
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
