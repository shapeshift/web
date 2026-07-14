import { tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetTronTradeQuoteInput,
  GetUnsignedTronTransactionArgs,
  SwapperApi,
  SwapperDeps,
  TradeQuoteResult,
  TradeRateResult,
} from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getSunioTradeQuote } from './getSunioTradeQuote/getSunioTradeQuote'
import { getSunioTradeRate } from './getSunioTradeRate/getSunioTradeRate'
import { buildSunioSwapCalldata } from './utils/buildSwapContractCall'
import { SUNIO_SMART_ROUTER_CONTRACT } from './utils/constants'
import { estimateSunioNetworkFeeCryptoBaseUnit } from './utils/estimateSunioNetworkFee'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const sunioApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTronTradeQuoteInput | CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<TradeQuoteResult> => {
    const maybeTradeQuote = await getSunioTradeQuote(input, deps)
    return maybeTradeQuote.map(quote => [quote])
  },

  getTradeRate: async (input: GetTradeRateInput, deps: SwapperDeps): Promise<TradeRateResult> => {
    const maybeTradeRate = await getSunioTradeRate(input, deps)
    return maybeTradeRate.map(rate => [rate])
  },

  getUnsignedTronTransaction: (args: GetUnsignedTronTransactionArgs): Promise<tron.TronSignTx> => {
    const {
      tradeQuote,
      stepIndex,
      from,
      slippageTolerancePercentageDecimal,
      assertGetTronChainAdapter,
    } = args

    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const sunioMetadata = step.sunioTransactionMetadata
    if (!sunioMetadata) {
      throw new Error('[Sun.io] Missing transaction metadata in quote')
    }

    const { accountNumber } = step
    if (accountNumber === undefined) {
      throw new Error('[Sun.io] accountNumber is required for execution')
    }

    const adapter = assertGetTronChainAdapter(tronChainId)

    const data = buildSunioSwapCalldata({
      route: sunioMetadata.route,
      sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      minBuyAmountCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
      to: tradeQuote.receiveAddress,
      slippageTolerancePercentageDecimal,
    })

    const isSellingNativeTrx = step.sellAsset.assetId === tronAssetId
    const value = isSellingNativeTrx ? step.sellAmountIncludingProtocolFeesCryptoBaseUnit : '0'

    return adapter.buildCustomApiTx({
      from,
      to: SUNIO_SMART_ROUTER_CONTRACT,
      accountNumber,
      data,
      value,
    })
  },

  getTronTransactionFees: async ({
    tradeQuote,
    stepIndex,
    from,
    slippageTolerancePercentageDecimal,
    assertGetTronChainAdapter,
  }: GetUnsignedTronTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const route = step.sunioTransactionMetadata?.route

    if (!route) {
      if (!step.feeData.networkFeeCryptoBaseUnit) throw new Error('Missing network fee in quote')
      return step.feeData.networkFeeCryptoBaseUnit
    }

    return await estimateSunioNetworkFeeCryptoBaseUnit({
      adapter: assertGetTronChainAdapter(tronChainId),
      route,
      sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      isSellingNativeTrx: step.sellAsset.assetId === tronAssetId,
      address: from,
      slippageTolerancePercentageDecimal,
    })
  },

  checkTradeStatus: async ({ txHash, assertGetTronChainAdapter }) => {
    try {
      // Wait for TronGrid indexing to avoid false "REVERT"
      await sleep(2000)

      const adapter = assertGetTronChainAdapter(tronChainId)
      const tx = await adapter.httpProvider.getTransaction({ txid: txHash })

      if (!tx) {
        return createDefaultStatusResponse(txHash)
      }

      const contractRet = tx.ret?.[0]?.contractRet

      // Tron reports many failure codes (REVERT, OUT_OF_ENERGY, OUT_OF_TIME, ...). A missing
      // contractRet means it isn't mined yet; any non-SUCCESS value is a terminal failure.
      const status = (() => {
        if (!contractRet) return TxStatus.Pending
        if (contractRet === 'SUCCESS') {
          return tx.confirmations > 0 ? TxStatus.Confirmed : TxStatus.Pending
        }
        return TxStatus.Failed
      })()

      return {
        status,
        buyTxHash: txHash,
        message: undefined,
      }
    } catch (error) {
      console.error('[Sun.io] Error checking trade status:', error)
      return createDefaultStatusResponse(txHash)
    }
  },
}
