import { tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { TronWeb } from 'tronweb'

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
import {
  buildSwapExactInputParameters,
  SUNIO_SWAP_EXACT_INPUT_SELECTOR,
} from './utils/buildSwapContractCall'
import { buildSwapRouteParameters } from './utils/buildSwapRouteParameters'
import { SUNIO_SMART_ROUTER_CONTRACT } from './utils/constants'
import { getSunioTransactionFees } from './utils/getSunioTransactionFees'

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

  getUnsignedTronTransaction: async (
    args: GetUnsignedTronTransactionArgs,
  ): Promise<tron.TronSignTx> => {
    const {
      tradeQuote,
      stepIndex,
      from,
      slippageTolerancePercentageDecimal,
      assertGetTronChainAdapter,
      config,
    } = args

    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const adapter = assertGetTronChainAdapter(tronChainId)

    const sunioTransactionData = step.sunioTransactionData
    if (!sunioTransactionData) throw new Error('[Sun.io] Missing transaction data in quote')

    const rpcUrl = adapter.httpProvider.getRpcUrl()

    const tronWeb = new TronWeb({
      fullHost: rpcUrl,
      headers: config.VITE_TRON_GRID_API_KEY
        ? { 'TRON-PRO-API-KEY': config.VITE_TRON_GRID_API_KEY }
        : {},
    })

    const routeParams = buildSwapRouteParameters(
      sunioTransactionData.route,
      step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      step.buyAmountAfterFeesCryptoBaseUnit,
      tradeQuote.receiveAddress,
      slippageTolerancePercentageDecimal,
    )

    const parameters = buildSwapExactInputParameters(routeParams)

    const isSellingNativeTrx = step.sellAsset.assetId === tronAssetId
    const callValue = isSellingNativeTrx
      ? Number(step.sellAmountIncludingProtocolFeesCryptoBaseUnit)
      : 0

    const options = {
      feeLimit: 100_000_000,
      callValue,
    }

    const txData = await tronWeb.transactionBuilder.triggerSmartContract(
      SUNIO_SMART_ROUTER_CONTRACT,
      SUNIO_SWAP_EXACT_INPUT_SELECTOR,
      options,
      parameters,
      from,
    )

    if (!txData.result || !txData.result.result) {
      throw new Error('[Sun.io] Failed to build swap transaction')
    }

    const transaction = txData.transaction

    const rawDataHex =
      typeof transaction.raw_data_hex === 'string'
        ? transaction.raw_data_hex
        : Buffer.isBuffer(transaction.raw_data_hex)
        ? (transaction.raw_data_hex as Buffer).toString('hex')
        : Array.isArray(transaction.raw_data_hex)
        ? Buffer.from(transaction.raw_data_hex as number[]).toString('hex')
        : (() => {
            throw new Error(`Unexpected raw_data_hex type: ${typeof transaction.raw_data_hex}`)
          })()

    if (!/^[0-9a-fA-F]+$/.test(rawDataHex)) {
      throw new Error(`Invalid raw_data_hex format: ${rawDataHex.slice(0, 100)}`)
    }

    const accountNumber = step.accountNumber
    if (accountNumber === undefined) {
      throw new Error('[Sun.io] accountNumber is required for execution')
    }
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const addressNList = toAddressNList(bip44Params)

    return {
      addressNList,
      rawDataHex,
      transaction,
    }
  },

  getTronTransactionFees: getSunioTransactionFees,

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
