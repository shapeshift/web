import type { EvmChainAdapter, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import {
  isCosmosSdkSwap,
  isEvmSwap,
  isUtxoSwap,
} from 'components/MultiHopTrade/hooks/useGetTradeQuotes/typeGuards'
import type { TradeQuoteInputCommonArgs } from 'components/MultiHopTrade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { toBaseUnit } from 'lib/math'
import type { GetTradeQuoteInput } from 'lib/swapper/api'

export type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountNumber: number
  wallet: HDWallet
  receiveAddress: string
  slippageTolerancePercentage?: string
  // Required for Osmo trades
  receiveAccountNumber?: number
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
  affiliateBps?: string
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
  slippageTolerancePercentage,
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
    allowMultiHop,
    slippageTolerancePercentage,
  }
  if (isEvmSwap(sellAsset?.chainId) || isCosmosSdkSwap(sellAsset?.chainId)) {
    const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as EvmChainAdapter
    const sendAddress = await sellAssetChainAdapter.getAddress({
      accountNumber: sellAccountNumber,
      wallet,
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
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as UtxoChainAdapter
    const sendAddress = await sellAssetChainAdapter.getAddress({
      accountNumber: sellAccountNumber,
      wallet,
    })
    const { xpub } = await sellAssetChainAdapter.getPublicKey(
      wallet,
      sellAccountNumber,
      sellAccountType,
    )
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      accountType: sellAccountType,
      xpub,
      sendAddress,
    }
  }
}
