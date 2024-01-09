import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { Asset, UtxoAccountType } from '@shapeshiftoss/types'
import {
  isCosmosSdkSwap,
  isEvmSwap,
  isUtxoSwap,
} from 'components/MultiHopTrade/hooks/useGetTradeQuotes/typeGuards'
import type { TradeQuoteInputCommonArgs } from 'components/MultiHopTrade/types'
import { toBaseUnit } from 'lib/math'
import { assertGetChainAdapter } from 'lib/utils'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'

export type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountNumber: number
  wallet: HDWallet
  receiveAddress: string
  slippageTolerancePercentageDecimal?: string
  receiveAccountNumber?: number
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
  // Potential affiliate bps - may be waved out either entirely or partially with FOX discounts
  potentialAffiliateBps: string
  // Actual affiliate bps - if the FOX discounts is off, this will be the same as *affiliateBps*
  // Otherwise, it will be the affiliate bps after the FOX discount is applied
  affiliateBps: string
  isSnapInstalled?: boolean
  pubKey?: string | undefined
  // KeepKey is rugged and requires a bandaid to disable affiliate fee for EVM sell assets, see https://github.com/shapeshift/web/issues/4518
  // Since we have a single shared input across all swappers, we need to pass this as feature detection to monkey patch affiliate bps to 0
  isKeepKey: boolean
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  receiveAddress,
  receiveAccountNumber,
  sellAmountBeforeFeesCryptoPrecision,
  allowMultiHop,
  affiliateBps,
  potentialAffiliateBps,
  slippageTolerancePercentageDecimal,
  pubKey,
  isKeepKey,
}: GetTradeQuoteInputArgs): Promise<GetTradeQuoteInput | undefined> => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountIncludingProtocolFeesCryptoBaseUnit: toBaseUnit(
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset?.precision || 0,
    ),
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber: sellAccountNumber,
    affiliateBps: affiliateBps ?? '0',
    potentialAffiliateBps: potentialAffiliateBps ?? '0',
    allowMultiHop,
    slippageTolerancePercentageDecimal,
    isKeepKey,
  }
  if (isEvmSwap(sellAsset?.chainId) || isCosmosSdkSwap(sellAsset?.chainId)) {
    const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
    const sellAssetChainAdapter = assertGetChainAdapter(sellAsset.chainId)
    const sendAddress = await sellAssetChainAdapter.getAddress({
      accountNumber: sellAccountNumber,
      wallet,
      pubKey,
    })
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      supportsEIP1559,
      sendAddress,
      receiveAccountNumber,
    }
  } else if (isUtxoSwap(sellAsset?.chainId)) {
    if (!sellAccountType) return
    const sellAssetChainAdapter = assertGetUtxoChainAdapter(sellAsset.chainId)
    const sendAddress = await sellAssetChainAdapter.getAddress({
      accountNumber: sellAccountNumber,
      wallet,
      accountType: sellAccountType,
      pubKey,
    })

    const xpub =
      pubKey ??
      (await sellAssetChainAdapter.getPublicKey(wallet, sellAccountNumber, sellAccountType)).xpub
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      accountType: sellAccountType,
      xpub,
      sendAddress,
    }
  }
}
