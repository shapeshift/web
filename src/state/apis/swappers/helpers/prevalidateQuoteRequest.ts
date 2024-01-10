import type { ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isTruthy } from 'lib/utils'

import type { ErrorWithMeta } from '../types'
import { TradeQuoteRequestError } from '../types'

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
}): ErrorWithMeta<TradeQuoteRequestError>[] => {
  // early exit - further validation errors without a wallet are wrong
  if (!isWalletConnected) {
    return [{ error: TradeQuoteRequestError.NoConnectedWallet }]
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
      error: TradeQuoteRequestError.SellAssetNotNotSupportedByWallet,
      meta: {
        assetSymbol: tradeQuoteInput.sellAsset.symbol,
        chainSymbol: getChainShortName(tradeQuoteInput.sellAsset.chainId as KnownChainIds),
      },
    },
    !walletSupportsBuyAssetChain &&
      !manualReceiveAddress && {
        error: TradeQuoteRequestError.BuyAssetNotNotSupportedByWallet,
        meta: {
          assetSymbol: tradeQuoteInput.buyAsset.symbol,
          chainSymbol: getChainShortName(tradeQuoteInput.buyAsset.chainId as KnownChainIds),
        },
      },
    !hasSufficientSellAssetBalance && {
      error: TradeQuoteRequestError.InsufficientSellAssetBalance,
    },
    !tradeQuoteInput.receiveAddress && {
      error: TradeQuoteRequestError.NoReceiveAddress,
      meta: {
        assetSymbol: tradeQuoteInput.buyAsset.symbol,
        chainSymbol: getChainShortName(tradeQuoteInput.buyAsset.chainId as KnownChainIds),
      },
    },
  ].filter(isTruthy)
}
