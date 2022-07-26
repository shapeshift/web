import { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../../utils/bignumber'
import { InboundResponse, ThorchainSwapperDeps } from '../../../types'
import { getPriceRatio } from '../../getPriceRatio/getPriceRatio'
import { makeSwapMemo } from '../../makeSwapMemo/makeSwapMemo'
import { thorService } from '../../thorService'
import { deposit } from '../routerCalldata'

type GetBtcThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  slippageTolerance: string
  destinationAddress: string
}
type GetBtcThorTxInfoReturn = Promise<{
  data: string
  memo: string
  router: string
}>
type GetBtcThorTxInfo = (args: GetBtcThorTxInfoArgs) => GetBtcThorTxInfoReturn

export const getThorTxInfo: GetBtcThorTxInfo = async ({
  deps,
  sellAsset,
  buyAsset,
  sellAmount,
  slippageTolerance,
  destinationAddress
}) => {
  try {
    const { assetReference, assetNamespace } = fromAssetId(sellAsset.assetId)

    const isErc20Trade = assetNamespace === 'erc20'
    const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
      `${deps.midgardUrl}/thorchain/inbound_addresses`
    )

    const ethInboundAddresses = inboundAddresses.find((inbound) => inbound.chain === 'ETH')

    const vault = ethInboundAddresses?.address
    const router = ethInboundAddresses?.router

    if (!vault || !router)
      throw new SwapError(`[getPriceRatio]: router or vault found for ETH`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { inboundAddresses }
      })

    const priceRatio = await getPriceRatio(deps, {
      buyAssetId: buyAsset.assetId,
      sellAssetId: sellAsset.assetId
    })

    const expectedBuyAmount = toBaseUnit(
      fromBaseUnit(bnOrZero(sellAmount).dividedBy(priceRatio), sellAsset.precision),
      buyAsset.precision
    )

    const isValidSlippageRange =
      bnOrZero(slippageTolerance).gte(0) && bnOrZero(slippageTolerance).lte(1)
    if (bnOrZero(expectedBuyAmount).lt(0) || !isValidSlippageRange)
      throw new SwapError('[makeTradeTx]: bad expected buy amount or bad slippage tolerance', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED,
        details: { expectedBuyAmount, slippageTolerance }
      })

    const limit = bnOrZero(expectedBuyAmount)
      .times(bn(1).minus(slippageTolerance))
      .decimalPlaces(0)
      .toString()

    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit
    })

    const data = await deposit(
      router,
      vault,
      isErc20Trade ? assetReference : '0x0000000000000000000000000000000000000000',
      sellAmount,
      memo
    )

    return {
      data,
      memo,
      router
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
