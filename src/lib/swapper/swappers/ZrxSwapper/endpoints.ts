import type { ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { isEvmChainAdapter } from 'lib/utils'

import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import type { ZrxSwapStatusResponse } from './types'
import { fetchZrxQuote } from './utils/fetchZrxQuote'
import { zrxServiceFactory } from './utils/zrxService'

export const zrxApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({ from, tradeQuote, stepIndex }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountBeforeFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, recommendedSlippage, affiliateBps } = tradeQuote

    const chainId = sellAsset.chainId
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as ChainAdapter<EvmChainId>

    if (adapter === undefined) {
      throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId },
      })
    }

    if (!isEvmChainAdapter(adapter)) {
      throw new SwapError('[executeTrade] - non-EVM chain adapter detected', {
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
        details: {
          chainAdapterName: adapter.getDisplayName(),
          chainId: adapter.getChainId(),
        },
      })
    }

    const maybeZrxQuote = await fetchZrxQuote({
      buyAsset,
      sellAsset,
      receiveAddress,
      slippage: recommendedSlippage, // TODO: use the slippage from user input
      affiliateBps,
      sellAmountBeforeFeesCryptoBaseUnit,
    })

    if (maybeZrxQuote.isErr()) throw maybeZrxQuote.unwrapErr()
    const { data: zrxQuote } = maybeZrxQuote.unwrap()

    const { value, to, gasPrice, gas, data } = zrxQuote

    const buildSendApiTxInput = {
      value: value.toString(),
      to,
      from: from!,
      chainSpecific: {
        gasPrice: gasPrice.toString(),
        gasLimit: gas.toString(),
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        data: data.toString(),
      },
      accountNumber,
    }
    return adapter.buildSendApiTransaction(buildSendApiTxInput)
  },

  checkTradeStatus: async ({
    txId,
  }): Promise<{ status: TxStatus; buyTxId: string | undefined; message: string | undefined }> => {
    const zrxService = zrxServiceFactory({
      baseUrl: 'https://api.0x.org/',
    })

    // https://0x.org/docs/tx-relay-api/api-references/get-tx-relay-v1-swap-status-trade-hash.md
    const maybeStatusResponse = await zrxService.get<ZrxSwapStatusResponse>(
      `/tx-relay/v1/swap/status/${txId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        status: TxStatus.Unknown,
        buyTxId: txId,
        message: undefined,
      }
    }

    const {
      data: { status: rawStatus, reason: message },
    } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (rawStatus) {
        case 'pending':
        case 'submitted':
          return TxStatus.Pending
        case 'succeeded':
        case 'confirmed':
          return TxStatus.Confirmed
        case 'failed':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return Promise.resolve({
      status,
      buyTxId: txId,
      message,
    })
  },
}
