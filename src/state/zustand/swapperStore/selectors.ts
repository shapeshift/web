import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { createSelector } from 'reselect'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
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

export const selectAction = (state: SwapperState) => state.action
export const selectAmount = (state: SwapperState) => state.amount
export const selectReceiveAddress = (state: SwapperState) => state.receiveAddress
export const selectFees = (state: SwapperState) => state.fees
export const selectProtocolFees = (state: SwapperState) => state.fees?.protocolFees
export const selectTrade = (state: SwapperState) => state.trade
export const selectPreferredSwapper = (state: SwapperState) => state.preferredSwapper
export const selectActiveSwapperWithMetadata = (state: SwapperState) => {
  const { availableSwappersWithMetadata, preferredSwapper } = state

  if (availableSwappersWithMetadata === undefined) return
  const firstAvailableSwapper = availableSwappersWithMetadata[0]

  if (!preferredSwapper) return firstAvailableSwapper

  return (
    availableSwappersWithMetadata.find(({ swapper }) => swapper.name === preferredSwapper) ??
    firstAvailableSwapper
  )
}

export const selectActiveSwapperName = createSelector(
  selectActiveSwapperWithMetadata,
  activeSwapperWithMetadata => activeSwapperWithMetadata?.swapper.name,
)

export const selectAvailableSwappersWithMetadata = (state: SwapperState) =>
  state.availableSwappersWithMetadata

export const selectSlippage = createSelector(
  selectActiveSwapperWithMetadata,
  activeSwapperWithMetadata =>
    activeSwapperWithMetadata?.quote.recommendedSlippage ??
    getDefaultSlippagePercentageForSwapper(activeSwapperWithMetadata?.swapper.name),
)

export const selectQuote = createSelector(
  selectActiveSwapperWithMetadata,
  activeSwapperWithMetadata => activeSwapperWithMetadata?.quote,
)

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = createSelector(
  selectActiveSwapperWithMetadata,
  activeSwapperWithMetadata => {
    const activeSwapper = activeSwapperWithMetadata?.swapper
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
  },
)

export const selectSwapperDefaultAffiliateBps = createSelector(
  selectActiveSwapperWithMetadata,
  activeSwapperWithMetadata => {
    const activeSwapper = activeSwapperWithMetadata?.swapper
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
  },
)
