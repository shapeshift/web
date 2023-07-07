import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote,
  TradeQuote2,
  UnsignedTx,
} from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import type { Rates, ThorUtxoSupportedChainId } from './ThorchainSwapper'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

export const thorchainApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    rates: Rates,
    runeAssetUsdRate: string,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const { receiveAddress, affiliateBps } = input

    const processQuote = (
      quote: Result<TradeQuote, SwapErrorRight>,
      receiveAddress: string,
      affiliateBps: string | undefined,
      isDonationAmountBelowMinimum?: boolean,
    ) => {
      const id = uuid()
      return quote.map<TradeQuote2>(quote => ({
        id,
        receiveAddress,
        affiliateBps: isDonationAmountBelowMinimum ? undefined : affiliateBps,
        ...quote,
      }))
    }

    return await getThorTradeQuote(input, rates).then(async firstQuote => {
      if (firstQuote.isOk()) {
        const successfulQuote = firstQuote.unwrap()
        const firstHop = successfulQuote.steps[0]
        const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
          firstHop.buyAmountBeforeFeesCryptoBaseUnit,
          firstHop.buyAsset.precision,
        )
        const buyAmountUsd = bnOrZero(buyAmountBeforeFeesCryptoPrecision).times(
          rates.buyAssetUsdRate,
        )
        const donationAmountUsd = buyAmountUsd.times(affiliateBps).div(10000)
        const isDonationAmountBelowMinimum = bnOrZero(donationAmountUsd)
          .div(runeAssetUsdRate)
          .lte(RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN)

        const quoteToUse = isDonationAmountBelowMinimum
          ? /*
          If the donation amount is below the minimum,
          we need to fetch a new quote with no affiliate fee
        */
            await getThorTradeQuote({ ...input, affiliateBps: '0' }, rates)
          : firstQuote

        return processQuote(quoteToUse, receiveAddress, affiliateBps, isDonationAmountBelowMinimum)
      } else {
        return processQuote(firstQuote, receiveAddress, affiliateBps)
      }
    })
  },

  getUnsignedTx: async ({
    accountMetadata,
    tradeQuote,
    from,
    xpub,
    supportsEIP1559,
    buyAssetUsdRate,
    feeAssetUsdRate,
  }): Promise<UnsignedTx> => {
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
      buyAssetUsdRate,
      ...fromOrXpub,
      feeAssetUsdRate,
      supportsEIP1559,
    })
  },

  checkTradeStatus: async ({
    txHash,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    try {
      // thorchain swapper uses txId to get tx status (not trade ID)
      const { buyTxId: buyTxHash } = await getTradeTxs({ tradeId: txHash })
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
