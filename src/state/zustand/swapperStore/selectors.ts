import type { ChainId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import {
  isCosmosSdkSwap,
  isEvmSwap,
  isUtxoSwap,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import type { BuildTradeInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { toBaseUnit } from 'lib/math'
import type { SwapErrorRight, Trade, TradeQuote } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import type { SwapperState } from 'state/zustand/swapperStore/types'

// Convenience selectors for accessing swapper store state
export const selectSelectedSellAssetAccountId = (state: SwapperState) =>
  state.selectedSellAssetAccountId
export const selectSelectedBuyAssetAccountId = (state: SwapperState) =>
  state.selectedBuyAssetAccountId
export const selectSellAssetAccountId = (state: SwapperState) => state.sellAssetAccountId
export const selectBuyAssetAccountId = (state: SwapperState) => state.buyAssetAccountId
export const selectBuyAmountCryptoPrecision = (state: SwapperState) =>
  state.buyAmountCryptoPrecision
export const selectSellAmountCryptoPrecision = (state: SwapperState) =>
  state.sellAmountCryptoPrecision
export const selectSellAsset = (state: SwapperState) => state.sellAsset
export const selectBuyAsset = (state: SwapperState) => state.buyAsset
export const selectSellAmountFiat = (state: SwapperState) => state.sellAmountFiat
export const selectBuyAmountFiat = (state: SwapperState) => state.buyAmountFiat
export const selectSellAssetFiatRate = (state: SwapperState) => state.sellAssetFiatRate
export const selectBuyAssetFiatRate = (state: SwapperState) => state.buyAssetFiatRate
export const selectFeeAssetFiatRate = (state: SwapperState) => state.feeAssetFiatRate
export const selectAction = (state: SwapperState) => state.action
export const selectIsExactAllowance = (state: SwapperState) => state.isExactAllowance
export const selectIsSendMax = (state: SwapperState) => state.isSendMax
export const selectAmount = (state: SwapperState) => state.amount
export const selectReceiveAddress = (state: SwapperState) => state.receiveAddress
export const selectFees = (state: SwapperState) => state.fees
export const selectTrade = (state: SwapperState) => state.trade
export const selectSwapperName = (state: SwapperState) =>
  state.activeSwapperWithMetadata?.swapper.name
export const selectActiveSwapperWithMetadata = (state: SwapperState) =>
  state.activeSwapperWithMetadata
export const selectAvailableSwappersWithMetadata = (state: SwapperState) =>
  state.availableSwappersWithMetadata
export const selectSelectedCurrencyToUsdRate = (state: SwapperState) =>
  state.selectedCurrencyToUsdRate
export const selectSlippage = (state: SwapperState): string =>
  state.activeSwapperWithMetadata?.quote.recommendedSlippage ?? DEFAULT_SLIPPAGE
export const selectAffiliateBps = (state: SwapperState): string => state.activeAffiliateBps

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
  const swapperName = activeSwapper?.name

  if (swapperName === undefined) return false

  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Osmosis:
    case SwapperName.LIFI:
      return true
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
    case SwapperName.Test:
    case SwapperName.OneInch:
      return false
    default:
      assertUnreachable(swapperName)
  }
}

export const selectSwapperDefaultAffiliateBps = (state: SwapperState): string => {
  const activeSwapper = state.activeSwapperWithMetadata?.swapper
  const swapperName = activeSwapper?.name

  if (swapperName === undefined) return '0'

  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Zrx:
    case SwapperName.OneInch:
      return '30'
    case SwapperName.Osmosis:
    case SwapperName.LIFI:
    case SwapperName.CowSwap:
    case SwapperName.Test:
      return '0'
    default:
      assertUnreachable(swapperName)
  }
}

export const selectCheckApprovalNeededForWallet = (
  state: SwapperState,
): ((wallet: HDWallet) => Promise<Result<boolean, SwapErrorRight>>) => {
  return async (wallet: HDWallet): Promise<Result<boolean, SwapErrorRight>> => {
    const activeSwapper = state.activeSwapperWithMetadata?.swapper
    const activeQuote = state.activeSwapperWithMetadata?.quote
    if (!activeSwapper) throw new Error('No swapper available')
    if (!activeQuote) throw new Error('No quote available')

    return (await activeSwapper.approvalNeeded({ quote: activeQuote, wallet })).andThen(
      ({ approvalNeeded }) => Ok(approvalNeeded),
    )
  }
}

type SelectGetTradeForWalletArgs = {
  wallet: HDWallet
  sellAccountBip44Params: BIP44Params
  buyAccountBip44Params: BIP44Params
  sellAccountMetadata: AccountMetadata
  affiliateBps: string
}

type SelectGetTradeForWalletReturn = Promise<Result<Trade<ChainId>, SwapErrorRight>>

export const selectGetTradeForWallet = (
  state: SwapperState,
): ((_: SelectGetTradeForWalletArgs) => SelectGetTradeForWalletReturn) => {
  return async ({
    wallet,
    sellAccountMetadata,
    sellAccountBip44Params,
    buyAccountBip44Params,
    affiliateBps,
  }: SelectGetTradeForWalletArgs): SelectGetTradeForWalletReturn => {
    const activeSwapper = state.activeSwapperWithMetadata?.swapper
    const activeQuote = state.activeSwapperWithMetadata?.quote
    const buyAsset = state.buyAsset
    const sellAsset = state.sellAsset
    const sellAssetAccountId = state.sellAssetAccountId
    const sellAmountCryptoPrecision = state.sellAmountCryptoPrecision
    const receiveAddress = state.receiveAddress

    if (!activeSwapper) throw new Error('No swapper available')
    if (!activeQuote) throw new Error('No quote available')
    if (!buyAsset) throw new Error('Missing buyAsset')
    if (!sellAsset) throw new Error('No sellAsset')
    if (!sellAssetAccountId) throw new Error('Missing sellAssetAccountId')
    if (!sellAmountCryptoPrecision) throw new Error('Missing sellTradeAsset.amount')
    if (!receiveAddress) throw new Error('Missing receiveAddress')

    const buildTradeCommonArgs: BuildTradeInputCommonArgs = {
      sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
        sellAmountCryptoPrecision,
        sellAsset.precision,
      ),
      sellAsset,
      buyAsset,
      wallet,
      sendMax: state.isSendMax,
      receiveAddress,
      slippage: selectSlippage(state),
      affiliateBps,
    }

    if (isUtxoSwap(sellAsset.chainId)) {
      const {
        accountType,
        bip44Params: { accountNumber },
      } = sellAccountMetadata

      if (!accountType) throw new Error('accountType required')

      const sellAssetChainAdapter = getChainAdapterManager().get(
        sellAsset.chainId,
      ) as unknown as UtxoBaseAdapter<UtxoChainId>

      const { xpub } = await sellAssetChainAdapter.getPublicKey(wallet, accountNumber, accountType)

      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAsset.chainId,
        accountNumber,
        accountType,
        xpub,
      })
    } else if (isEvmSwap(sellAsset.chainId) || isCosmosSdkSwap(sellAsset.chainId)) {
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAsset.chainId,
        accountNumber: sellAccountBip44Params.accountNumber,
        receiveAccountNumber: buyAccountBip44Params.accountNumber,
      })
    } else {
      throw new Error('unsupported sellAsset.chainId')
    }
  }
}
