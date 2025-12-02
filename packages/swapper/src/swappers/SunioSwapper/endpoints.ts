import { tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { TronWeb } from 'tronweb'

import { toAddressNList } from '@shapeshiftoss/chain-adapters'

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
import { buildSwapRouteParameters } from './utils/buildSwapRouteParameters'
import { SUNIO_SMART_ROUTER_CONTRACT } from './utils/constants'

const convertAddressesToEvmFormat = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(v => convertAddressesToEvmFormat(v))
  }

  if (typeof value === 'string' && value.startsWith('T') && TronWeb.isAddress(value)) {
    const hex = TronWeb.address.toHex(value)
    return hex.replace(/^41/, '0x')
  }

  return value
}

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

    const parameters = [
      { type: 'address[]', value: routeParams.path },
      { type: 'string[]', value: routeParams.poolVersion },
      { type: 'uint256[]', value: routeParams.versionLen },
      { type: 'uint24[]', value: routeParams.fees },
      {
        type: 'tuple(uint256,uint256,address,uint256)',
        value: convertAddressesToEvmFormat([
          routeParams.swapData.amountIn,
          routeParams.swapData.amountOutMin,
          routeParams.swapData.recipient,
          routeParams.swapData.deadline,
        ]),
      },
    ]

    const functionSelector =
      'swapExactInput(address[],string[],uint256[],uint24[],(uint256,uint256,address,uint256))'

    const isSellingNativeTrx = step.sellAsset.assetId === tronAssetId
    const callValue = isSellingNativeTrx ? Number(step.sellAmountIncludingProtocolFeesCryptoBaseUnit) : 0

    const options = {
      feeLimit: 100_000_000,
      callValue,
    }

    const txData = await tronWeb.transactionBuilder.triggerSmartContract(
      SUNIO_SMART_ROUTER_CONTRACT,
      functionSelector,
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

  getTronTransactionFees,

  checkTradeStatus: async ({ txHash, assertGetTronChainAdapter }) => {
    try {
      const adapter = assertGetTronChainAdapter(tronChainId)
      const rpcUrl = (adapter as any).rpcUrl

      const response = await fetch(`${rpcUrl}/wallet/gettransactionbyid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: txHash, visible: true }),
      })

      if (!response.ok) {
        return createDefaultStatusResponse(txHash)
      }

      const tx = await response.json()

      if (!tx || !tx.txID) {
        return createDefaultStatusResponse(txHash)
      }

      const contractRet = tx.ret?.[0]?.contractRet

      const status =
        contractRet === 'SUCCESS' ? TxStatus.Confirmed : contractRet === 'REVERT' ? TxStatus.Failed : TxStatus.Pending

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
