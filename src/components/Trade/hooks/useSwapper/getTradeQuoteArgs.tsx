import type { Asset } from '@shapeshiftoss/asset-service'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import {
  isEvmSwap,
  isUtxoSwap,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'
import type { TradeQuoteInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { toBaseUnit } from 'lib/math'

export type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountNumber: number
  wallet: HDWallet
  receiveAddress: NonNullable<SwapperState['receiveAddress']>
  sellAmountBeforeFeesCryptoPrecision: string
  isSendMax: boolean
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  receiveAddress,
  sellAmountBeforeFeesCryptoPrecision,
  isSendMax,
}: GetTradeQuoteInputArgs): Promise<GetTradeQuoteInput | undefined> => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset?.precision || 0,
    ),
    sellAsset,
    buyAsset,
    sendMax: isSendMax,
    receiveAddress,
    accountNumber: sellAccountNumber,
  }
  if (isEvmSwap(sellAsset?.chainId)) {
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
    }
  } else if (isUtxoSwap(sellAsset?.chainId)) {
    if (!sellAccountType) return
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as UtxoBaseAdapter<UtxoChainId>
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
    }
  }
}
