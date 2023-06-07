import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
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
import type { SwapperState } from 'state/zustand/swapperStore/types'

export type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountNumber: number
  wallet: HDWallet
  receiveAddress: SwapperState['receiveAddress']
  sellAmountBeforeFeesCryptoPrecision: string
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  receiveAddress,
  sellAmountBeforeFeesCryptoPrecision,
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
  }
  if (isEvmSwap(sellAsset?.chainId) || isCosmosSdkSwap(sellAsset?.chainId)) {
    const eip1559Support = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      eip1559Support,
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
