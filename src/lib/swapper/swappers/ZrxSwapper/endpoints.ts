import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import type {
  CheckTradeStatusInput,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { assertGetEvmChainAdapter, checkEvmSwapStatus } from 'lib/utils/evm'

import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { fetchZrxQuote } from './utils/fetchZrxQuote'

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

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

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

  checkTradeStatus: ({
    tradeId,
    txHash,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    // TODO: it might be smart to pass in the chainId rather than having to pull it out of storage
    const getChainId = ({ tradeId }: CheckTradeStatusInput) =>
      tradeQuoteMetadata.get(tradeId)?.chainId

    return checkEvmSwapStatus({
      tradeId,
      txHash,
      getChainId,
    })
  },
}
