import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorMonad } from '../../../../api'
import { SwapError, SwapErrorType } from '../../../../api'
import type { ThorchainSwapperDeps } from '../../types'
import { getInboundAddressDataForChain } from '../../utils/getInboundAddressDataForChain'
import { getLimit } from '../../utils/getLimit/getLimit'
import { makeSwapMemo } from '../../utils/makeSwapMemo/makeSwapMemo'
import { deposit } from '../routerCalldata'

type GetBtcThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string
  buyAssetTradeFeeUsd: string
}

type GetBtcThorTxInfoReturn = Promise<
  Result<
    {
      data: string
      router: string
    },
    SwapErrorMonad
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
}) => {
  try {
    const { assetReference, assetNamespace } = fromAssetId(sellAsset.assetId)
    const isErc20Trade = assetNamespace === 'erc20'
    const inboundAddress = await getInboundAddressDataForChain(deps.daemonUrl, sellAsset.assetId)
    const router = inboundAddress?.router
    const vault = inboundAddress?.address
    if (!inboundAddress || !router || !vault)
      // TODO(gomes): handle monadically
      throw new SwapError(`[getPriceRatio]: inboundAddress not found for ETH`, {
        code: SwapErrorType.RESPONSE_ERROR,
        details: { inboundAddress },
      })

    const maybeLimit = await getLimit({
      buyAssetId: buyAsset.assetId,
      sellAmountCryptoBaseUnit,
      sellAsset,
      slippageTolerance,
      deps,
      buyAssetTradeFeeUsd,
      receiveAddress: destinationAddress,
    })

    if (maybeLimit.isErr()) return Err(maybeLimit.unwrapErr())
    const limit = maybeLimit.unwrap()

    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit,
    })

    const data = deposit(
      router,
      vault,
      isErc20Trade ? assetReference : '0x0000000000000000000000000000000000000000',
      sellAmountCryptoBaseUnit,
      memo,
    )

    return Ok({ data, router })
  } catch (e) {
    // TODO(gomes): handle monadically
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorType.TRADE_QUOTE_FAILED })
  }
}
