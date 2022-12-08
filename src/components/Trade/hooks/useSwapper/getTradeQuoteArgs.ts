import type { Asset } from '@shapeshiftoss/asset-service'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import {
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import type { TradeQuoteInputCommonArgs, TS } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { toBaseUnit } from 'lib/math'

export type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountBip44Params: BIP44Params
  wallet: HDWallet
  receiveAddress: NonNullable<TS['receiveAddress']>
  sellAmount: string
  isSendMax: boolean
}
export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountBip44Params,
  sellAccountType,
  wallet,
  receiveAddress,
  sellAmount,
  isSendMax,
}: GetTradeQuoteInputArgs) => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountCryptoPrecision: toBaseUnit(sellAmount, sellAsset?.precision || 0),
    sellAsset,
    buyAsset,
    sendMax: isSendMax,
    receiveAddress,
  }
  if (isSupportedNonUtxoSwappingChain(sellAsset?.chainId)) {
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountBip44Params,
    }
  } else if (isSupportedUtxoSwappingChain(sellAsset?.chainId)) {
    if (!sellAccountType) return
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
    const { xpub } = await sellAssetChainAdapter.getPublicKey(
      wallet,
      sellAccountBip44Params,
      sellAccountType,
    )
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountBip44Params,
      accountType: sellAccountType,
      xpub,
    }
  }
}
