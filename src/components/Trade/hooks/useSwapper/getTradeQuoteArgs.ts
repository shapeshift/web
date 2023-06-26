import type { EvmChainAdapter, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import {
  isCosmosSdkSwap,
  isEvmSwap,
  isUtxoSwap,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import type { TradeQuoteInputCommonArgs } from 'components/Trade/types'
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
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  receiveAddress,
  sellAmountBeforeFeesCryptoPrecision,
  allowMultiHop,
}: GetTradeQuoteInputArgs): Promise<GetTradeQuoteInput | undefined> => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset?.precision || 0,
    ),
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber: sellAccountNumber,
    affiliateBps: '0',
    allowMultiHop,
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
