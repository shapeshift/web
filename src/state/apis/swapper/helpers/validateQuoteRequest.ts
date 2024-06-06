import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isTruthy } from 'lib/utils'

import type { ErrorWithMeta } from '../types'
import { TradeQuoteRequestError } from '../types'

export const validateQuoteRequest = ({
  isWalletConnected,
  walletConnectedChainIds,
  manualReceiveAddress,
  sellAssetBalanceCryptoBaseUnit,
  sellAmountCryptoBaseUnit,
  sellAsset,
  buyAsset,
}: {
  isWalletConnected: boolean
  walletConnectedChainIds: ChainId[]
  manualReceiveAddress: string | undefined
  sellAssetBalanceCryptoBaseUnit: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
}): ErrorWithMeta<TradeQuoteRequestError>[] => {
  // early exit - further validation errors without a wallet are wrong
  if (!isWalletConnected) {
    return [{ error: TradeQuoteRequestError.NoConnectedWallet }]
  }

  const walletSupportsSellAssetChain = walletConnectedChainIds.includes(sellAsset.chainId)
  const walletSupportsBuyAssetChain = walletConnectedChainIds.includes(buyAsset.chainId)
  const hasSufficientSellAssetBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    bnOrZero(sellAmountCryptoBaseUnit),
  )

  return [
    !walletSupportsSellAssetChain && {
      error: TradeQuoteRequestError.SellAssetNotNotSupportedByWallet,
      meta: {
        assetSymbol: sellAsset.symbol,
        chainSymbol: getChainShortName(sellAsset.chainId as KnownChainIds),
      },
    },
    !walletSupportsBuyAssetChain &&
      !manualReceiveAddress && {
        error: TradeQuoteRequestError.BuyAssetNotNotSupportedByWallet,
        meta: {
          assetSymbol: buyAsset.symbol,
          chainSymbol: getChainShortName(buyAsset.chainId as KnownChainIds),
        },
      },
    !hasSufficientSellAssetBalance && {
      error: TradeQuoteRequestError.InsufficientSellAssetBalance,
    },
  ].filter(isTruthy)
}
