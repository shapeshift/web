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
}: GetTradeQuoteInputArgs): Promise<GetTradeQuoteInput> => {
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountIncludingProtocolFeesCryptoBaseUnit: toBaseUnit(
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset.precision,
    ),
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber: sellAccountNumber,
    affiliateBps: affiliateBps ?? '0',
    potentialAffiliateBps: potentialAffiliateBps ?? '0',
    allowMultiHop,
    slippageTolerancePercentageDecimal,
  }

  if (isEvmSwap(sellAsset.chainId) || isCosmosSdkSwap(sellAsset.chainId)) {
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
  } else if (isUtxoSwap(sellAsset.chainId)) {
    if (!sellAccountType) {
      throw Error('missing account type')
    }
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

  throw Error('unexpected chain namespace')
}
