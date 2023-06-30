import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getTxStatus } from '@shapeshiftoss/unchained-client/dist/evm'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'

import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { fetchZrxQuote } from './utils/fetchZrxQuote'
import { assertGetAdapter } from './utils/helpers/helpers'

const createDefaultStatusResponse = (buyTxId: string) => ({
  status: TxStatus.Unknown,
  buyTxId,
  message: undefined,
})

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const zrxApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInput,
      sellAssetUsdRate,
    )

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()
      tradeQuoteMetadata.set(id, { chainId: tradeQuote.steps[0].sellAsset.chainId as EvmChainId })
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({ from, tradeQuote, stepIndex }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountBeforeFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, recommendedSlippage, affiliateBps } = tradeQuote

    const adapter = assertGetAdapter(sellAsset.chainId)

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
    tradeId,
    txId,
  }): Promise<{ status: TxStatus; buyTxId: string | undefined; message: string | undefined }> => {
    try {
      const maybeTradeQuoteMetadata = tradeQuoteMetadata.get(tradeId)
      if (!maybeTradeQuoteMetadata) {
        return createDefaultStatusResponse(txId)
      }

      const adapter = assertGetAdapter(maybeTradeQuoteMetadata.chainId)
      const tx = await adapter.httpProvider.getTransaction({ txid: txId })
      const status = getTxStatus(tx)

      return {
        status,
        buyTxId: txId,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return createDefaultStatusResponse(txId)
    }
  },
}
