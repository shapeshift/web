import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import type { ProtocolFee, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { deposit } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerCalldata'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getLimit } from 'lib/swapper/swappers/ThorchainSwapper/utils/getLimit/getLimit'
import { makeSwapMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/makeSwapMemo'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

import type { ThornodeQuoteResponseSuccess } from '../../types'

type GetEvmThorTxInfoArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string
  protocolFees: Record<AssetId, ProtocolFee>
  affiliateBps: string
  buyAssetUsdRate: string
  feeAssetUsdRate: string
  thornodeQuote: ThornodeQuoteResponseSuccess
}

type GetEvmThorTxInfoReturn = Promise<
  Result<
    {
      data: string
      router: string
    },
    SwapErrorRight
  >
>

type GetBtcThorTxInfo = (args: GetEvmThorTxInfoArgs) => GetEvmThorTxInfoReturn

export const getThorTxInfo: GetBtcThorTxInfo = async ({
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  destinationAddress,
  protocolFees,
  affiliateBps,
  buyAssetUsdRate,
  feeAssetUsdRate,
  thornodeQuote,
}) => {
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const { assetReference } = fromAssetId(sellAsset.assetId)

  const maybeInboundAddress = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId)
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
    protocolFees,
    buyAssetUsdRate,
    feeAssetUsdRate,
    thornodeQuote,
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
      isNativeEvmAsset(sellAsset.assetId)
        ? '0x0000000000000000000000000000000000000000'
        : assetReference,
      sellAmountCryptoBaseUnit,
      memo,
    )

    return Ok({ data, router })
  })
}
