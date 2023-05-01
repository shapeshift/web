import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
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
  buyAssetTradeFeeUsd: string
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
  buyAssetTradeFeeUsd,
  affiliateBps,
}) => {
  try {
    const { assetReference, assetNamespace } = fromAssetId(sellAsset.assetId)
    const isErc20Trade = assetNamespace === 'erc20'
    const inboundAddress = await getInboundAddressDataForChain(deps.daemonUrl, sellAsset.assetId)
    const router = inboundAddress?.router
    const vault = inboundAddress?.address
    if (!inboundAddress || !router || !vault)
      return Err(
        makeSwapErrorRight({
          message: `[getPriceRatio]: inboundAddress not found for ETH`,
          code: SwapErrorType.RESPONSE_ERROR,
          details: { inboundAddress },
        }),
      )

    const maybeLimit = await getLimit({
      buyAssetId: buyAsset.assetId,
      sellAmountCryptoBaseUnit,
      sellAsset,
      slippageTolerance,
      deps,
      buyAssetTradeFeeUsd,
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

      const data = deposit(
        router,
        vault,
        isErc20Trade ? assetReference : '0x0000000000000000000000000000000000000000',
        sellAmountCryptoBaseUnit,
        memo,
      )

      return { data, router }
    })
  } catch (e) {
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[getThorTxInfo]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
