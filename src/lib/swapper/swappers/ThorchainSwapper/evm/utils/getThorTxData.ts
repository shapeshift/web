import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { ProtocolFee, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { deposit } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerCalldata'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getLimit } from 'lib/swapper/swappers/ThorchainSwapper/utils/getLimit/getLimit'
import { makeSwapMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/makeSwapMemo'

type GetBtcThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string
  protocolFees: Record<AssetId, ProtocolFee>
  affiliateBps: string
}

type GetBtcThorTxInfoReturn = Promise<
  Result<
    {
      data: string
      router: string
    },
    SwapErrorRight
  >
>

type GetBtcThorTxInfo = (args: GetBtcThorTxInfoArgs) => GetBtcThorTxInfoReturn

export const getThorTxInfo: GetBtcThorTxInfo = async ({
  deps,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  destinationAddress,
  protocolFees,
  affiliateBps,
}) => {
  const { assetReference, assetNamespace } = fromAssetId(sellAsset.assetId)
  const isErc20Trade = assetNamespace === 'erc20'
  const maybeInboundAddress = await getInboundAddressDataForChain(deps.daemonUrl, sellAsset.assetId)
  if (maybeInboundAddress.isErr()) return Err(maybeInboundAddress.unwrapErr())
  const inboundAddress = maybeInboundAddress.unwrap()
  const router = inboundAddress.router
  const vault = inboundAddress.address

  if (!router)
    return Err(
      makeSwapErrorRight({
        message: `[getPriceRatio]: No router found for ${sellAsset.assetId}`,
        code: SwapErrorType.RESPONSE_ERROR,
        details: { inboundAddress: maybeInboundAddress },
      }),
    )

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

  return maybeLimit.andThen(limit => {
    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit,
      affiliateBps,
    })

    const data = deposit(
      router,
      vault,
      isErc20Trade ? assetReference : '0x0000000000000000000000000000000000000000',
      sellAmountCryptoBaseUnit,
      memo,
    )

    return Ok({ data, router })
  })
}
