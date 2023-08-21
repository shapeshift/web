import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote,
  TradeQuote2,
  UnsignedTx2,
} from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThorUtxoSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'
import type { TradeQuoteDeps } from 'lib/swapper/types'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

export const thorchainApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    rates: TradeQuoteDeps,
  ): Promise<Result<TradeQuote2[], SwapErrorRight>> => {
    const { receiveAddress, affiliateBps } = input

    const mapTradeQuoteToTradeQuote2 = (
      quoteResult: Result<TradeQuote[], SwapErrorRight>,
      receiveAddress: string,
      affiliateBps: string | undefined,
      isDonationAmountBelowMinimum?: boolean,
    ): Result<TradeQuote2[], SwapErrorRight> => {
      return quoteResult.map<TradeQuote2[]>(quotes => {
        return quotes.map(quote => ({
          id: uuid(),
          receiveAddress,
          estimatedExecutionTimeMs: undefined,
          affiliateBps: isDonationAmountBelowMinimum ? undefined : affiliateBps,
          ...quote,
        }))
      })
    }

    return await getThorTradeQuote(input).then(async quoteResult => {
      // If the first quote fails there is no need to check if the donation amount is below the minimum
      if (quoteResult.isErr()) return Err(quoteResult.unwrapErr())

      const quotes = quoteResult.unwrap()
      const firstQuote = quotes[0]
      const firstHop = firstQuote.steps[0]
      const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
        firstHop.buyAmountBeforeFeesCryptoBaseUnit,
        firstHop.buyAsset.precision,
      )
      const buyAmountUsd = bnOrZero(buyAmountBeforeFeesCryptoPrecision).times(rates.buyAssetUsdRate)
      const donationAmountUsd = buyAmountUsd.times(affiliateBps).div(10000)
      const isDonationAmountBelowMinimum =
        bnOrZero(affiliateBps).gt(0) &&
        bnOrZero(donationAmountUsd)
          .div(rates.runeAssetUsdRate)
          .lte(RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN)

      const quoteToUse = isDonationAmountBelowMinimum
        ? /*
        If the donation amount is below the minimum,
        we need to fetch a new quote with no affiliate fee
      */
          await getThorTradeQuote({
            ...input,
            affiliateBps: '0',
          })
        : quoteResult

      return mapTradeQuoteToTradeQuote2(
        quoteToUse,
        receiveAddress,
        affiliateBps,
        isDonationAmountBelowMinimum,
      )
    })
  },

  getUnsignedTx: async ({
    accountMetadata,
    tradeQuote,
    from,
    xpub,
    supportsEIP1559,
    slippageTolerancePercentageDecimal,
  }): Promise<UnsignedTx2> => {
    const { receiveAddress, affiliateBps } = tradeQuote

    const accountType = accountMetadata?.accountType

    const chainSpecific =
      accountType && xpub
        ? {
            xpub,
            accountType,
            satoshiPerByte: (tradeQuote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
              .chainSpecific.satsPerByte,
          }
        : undefined

    const fromOrXpub = from !== undefined ? { from } : { xpub }
    return await getSignTxFromQuote({
      tradeQuote,
      receiveAddress,
      affiliateBps,
      chainSpecific,
      ...fromOrXpub,
      supportsEIP1559,
      slippageTolerancePercentage: slippageTolerancePercentageDecimal,
    })
  },

  checkTradeStatus: async ({
    txHash,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | undefined
  }> => {
    try {
      // thorchain swapper uses txId to get tx status (not trade ID)
      const { buyTxId: buyTxHash } = await getTradeTxs(txHash)
      const status = buyTxHash ? TxStatus.Confirmed : TxStatus.Pending

      return {
        buyTxHash,
        status,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Failed,
        message: undefined,
      }
    }
  },
}
