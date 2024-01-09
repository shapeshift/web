import type { ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isTruthy } from 'lib/utils'

import type { ValidationMeta } from '../types'
import { TradeQuoteRequestValidationError } from '../types'

export const prevalidateQuoteRequest = ({
  isWalletConnected,
  walletSupportedChains,
  manualReceiveAddress,
  sellAssetBalanceCryptoBaseUnit,
  tradeQuoteInput,
}: {
  isWalletConnected: boolean
  walletSupportedChains: ChainId[]
  manualReceiveAddress: string | undefined
  sellAssetBalanceCryptoBaseUnit: string
  tradeQuoteInput: GetTradeQuoteInput
}): ValidationMeta<TradeQuoteRequestValidationError>[] => {
  // early exit - further validation errors without a wallet are wrong
  if (!isWalletConnected) {
    return [{ error: TradeQuoteRequestValidationError.NoConnectedWallet }]
  }

  const walletSupportsSellAssetChain = walletSupportedChains.includes(
    tradeQuoteInput.sellAsset.chainId,
  )
  const walletSupportsBuyAssetChain = walletSupportedChains.includes(
    tradeQuoteInput.buyAsset.chainId,
  )
  const hasSufficientSellAssetBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    bnOrZero(tradeQuoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit),
  )

  return [
    !walletSupportsSellAssetChain && {
      error: TradeQuoteRequestValidationError.SellAssetNotNotSupportedByWallet,
    },
    !walletSupportsBuyAssetChain &&
      !manualReceiveAddress && {
        error: TradeQuoteRequestValidationError.BuyAssetNotNotSupportedByWallet,
      },
    !hasSufficientSellAssetBalance && {
      error: TradeQuoteRequestValidationError.InsufficientSellAssetBalance,
    },
    !tradeQuoteInput.receiveAddress && {
      error: TradeQuoteRequestValidationError.NoReceiveAddress,
    },
  ].filter(isTruthy)
}
