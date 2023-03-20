import type { ChainId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Trade, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { BIP44Params } from '@shapeshiftoss/types'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import {
  isSupportedCosmosSdkSwappingChain,
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import type { BuildTradeInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { toBaseUnit } from 'lib/math'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import type { SwapperState } from 'state/zustand/swapperStore/useSwapperStore'

export const selectSlippage = (state: SwapperState): string =>
  state.activeSwapperWithMetadata?.quote.recommendedSlippage ?? DEFAULT_SLIPPAGE

export const selectQuote = (state: SwapperState): TradeQuote<ChainId> | undefined =>
  state.activeSwapperWithMetadata?.quote

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = (state: SwapperState): boolean => {
  const activeSwapper = state.activeSwapperWithMetadata?.swapper
  switch (activeSwapper?.name) {
    case SwapperName.Thorchain:
    case SwapperName.Osmosis:
      return true
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
      return false
    default:
      return false
  }
}

export const selectCheckApprovalNeededForWallet = (
  state: SwapperState,
): ((wallet: HDWallet) => Promise<boolean>) => {
  return async (wallet: HDWallet): Promise<boolean> => {
    const activeSwapper = state.activeSwapperWithMetadata?.swapper
    const activeQuote = state.activeSwapperWithMetadata?.quote
    if (!activeSwapper) throw new Error('No swapper available')
    if (!activeQuote) throw new Error('No quote available')

    const { approvalNeeded } = await activeSwapper.approvalNeeded({ quote: activeQuote, wallet })
    return approvalNeeded
  }
}

type SelectGetTradeForWalletArgs = {
  wallet: HDWallet | null
  sellAccountBip44Params: BIP44Params | undefined
  buyAccountBip44Params: BIP44Params | undefined
  sellAccountMetadata: AccountMetadata | undefined
}
type SelectGetTradeForWalletReturn = Promise<Trade<ChainId> | undefined>
export const selectGetTradeForWallet = (
  state: SwapperState,
): ((_: SelectGetTradeForWalletArgs) => SelectGetTradeForWalletReturn) => {
  return async ({
    wallet,
    sellAccountMetadata,
    sellAccountBip44Params,
    buyAccountBip44Params,
  }: SelectGetTradeForWalletArgs): SelectGetTradeForWalletReturn => {
    const activeSwapper = state.activeSwapperWithMetadata?.swapper
    const activeQuote = state.activeSwapperWithMetadata?.quote
    const sellAsset = state.sellAsset
    const sellAmountCryptoPrecision = state.sellAmountCryptoPrecision
    const buyAsset = state.buyAsset
    const receiveAddress = state.receiveAddress
    const sellAssetAccountId = state.sellAssetAccountId
    const slippage = selectSlippage(state)
    const isSendMax = state.isSendMax

    if (!activeSwapper) throw new Error('No swapper available')
    if (!activeQuote) throw new Error('No quote available')
    if (!wallet) throw new Error('No wallet available')

    if (!sellAsset) throw new Error('No sellAsset')
    if (!activeSwapper) throw new Error('No swapper available')
    if (!sellAmountCryptoPrecision) throw new Error('Missing sellTradeAsset.amount')
    if (!sellAsset) throw new Error('Missing sellAsset')
    if (!buyAsset) throw new Error('Missing buyAsset')
    if (!wallet) throw new Error('Missing wallet')
    if (!receiveAddress) throw new Error('Missing receiveAddress')
    if (!sellAssetAccountId) throw new Error('Missing sellAssetAccountId')
    if (!sellAccountBip44Params) throw new Error('Missing sellAccountBip44Params')
    if (!buyAccountBip44Params) throw new Error('Missing buyAccountBip44Params')
    if (!sellAccountMetadata) throw new Error('Missing sellAccountMetadata')

    const buildTradeCommonArgs: BuildTradeInputCommonArgs = {
      sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
        sellAmountCryptoPrecision,
        sellAsset.precision,
      ),
      sellAsset,
      buyAsset,
      wallet,
      sendMax: isSendMax,
      receiveAddress,
      slippage,
    }
    const sellAssetChainId = sellAsset.chainId
    if (isSupportedCosmosSdkSwappingChain(sellAssetChainId)) {
      const { accountNumber } = sellAccountBip44Params
      const { accountNumber: receiveAccountNumber } = buyAccountBip44Params
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        accountNumber,
        receiveAccountNumber,
      })
    } else if (isSupportedNonUtxoSwappingChain(sellAssetChainId)) {
      const { accountNumber } = sellAccountBip44Params
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        accountNumber,
      })
    } else if (isSupportedUtxoSwappingChain(sellAssetChainId)) {
      const { accountType, bip44Params } = sellAccountMetadata
      const { accountNumber } = bip44Params
      if (!bip44Params) throw new Error('no bip44Params')
      if (!accountType) throw new Error('no accountType')
      const sellAssetChainAdapter = getChainAdapterManager().get(
        sellAssetChainId,
      ) as unknown as UtxoBaseAdapter<UtxoChainId>
      const { xpub } = await sellAssetChainAdapter.getPublicKey(wallet, accountNumber, accountType)
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        accountNumber,
        accountType,
        xpub,
      })
    }
  }
}
