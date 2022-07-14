import { btcChainId } from '@shapeshiftoss/caip'
import { bitcoin } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset, BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes } from '../../../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../../utils/bignumber'
import { InboundResponse, ThorchainSwapperDeps } from '../../../types'
import { getPriceRatio } from '../../getPriceRatio/getPriceRatio'
import { makeSwapMemo } from '../../makeSwapMemo/makeSwapMemo'
import { thorService } from '../../thorService'

type GetBtcThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  slippageTolerance: string
  destinationAddress: string
  wallet: HDWallet
  bip44Params: BIP44Params
  accountType: UtxoAccountType
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
  wallet,
  bip44Params,
  accountType
}) => {
  try {
    const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
      `${deps.midgardUrl}/thorchain/inbound_addresses`
    )

    const btcInboundAddresses = inboundAddresses.find((inbound) => inbound.chain === 'BTC')

    const vault = btcInboundAddresses?.address

    if (!vault)
      throw new SwapError(`[getThorTxInfo]: vault not found for BTC`, {
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
      throw new SwapError('[getThorTxInfo]: bad expected buy amount or bad slippage tolerance', {
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

    const adapter = deps.adapterManager.get(btcChainId)

    const pubkey = await (adapter as unknown as bitcoin.ChainAdapter).getPublicKey(
      wallet,
      bip44Params,
      accountType
    )

    return {
      opReturnData: memo,
      vault,
      pubkey: pubkey.xpub
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
