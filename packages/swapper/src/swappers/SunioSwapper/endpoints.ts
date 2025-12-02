import { tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import { TronWeb } from 'tronweb'

import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
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
import { SUNSWAP_ROUTER_ABI } from './utils/abi'
import { buildSwapRouteParameters } from './utils/buildSwapRouteParameters'
import { SUNIO_SMART_ROUTER_CONTRACT } from './utils/constants'

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
    } = args

    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const adapter = assertGetTronChainAdapter(tronChainId)

    const sunioMetadata = step.sunioTransactionMetadata
    if (!sunioMetadata) {
      throw new Error('[Sun.io] Missing transaction metadata in quote')
    }

    const rpcUrl = (adapter as any).rpcUrl

    const tronWeb = new TronWeb({
      fullHost: rpcUrl,
    })

    const routeParams = buildSwapRouteParameters(
      sunioMetadata.route,
      step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      step.buyAmountAfterFeesCryptoBaseUnit,
      from,
      slippageTolerancePercentageDecimal,
    )

    const contract = await tronWeb.contract(SUNSWAP_ROUTER_ABI, SUNIO_SMART_ROUTER_CONTRACT)

    const txData = await contract.methods
      .swapExactInput(
        routeParams.path,
        routeParams.poolVersion,
        routeParams.versionLen,
        routeParams.fees,
        [
          routeParams.swapData.amountIn,
          routeParams.swapData.amountOutMin,
          routeParams.swapData.recipient,
          routeParams.swapData.deadline,
        ],
      )
      ._build({
        feeLimit: 100_000_000,
        callValue: 0,
        from,
      })

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

    return {
      addressNList: [
        bip44Params.purpose,
        bip44Params.coinType,
        bip44Params.accountNumber,
        bip44Params.isChange ? 1 : 0,
        bip44Params.addressIndex ?? 0,
      ],
      rawDataHex,
      transaction,
    }
  },

  getTronTransactionFees,

  checkTradeStatus: ({ txHash }) => {
    return Promise.resolve(createDefaultStatusResponse(txHash))
  },
}
