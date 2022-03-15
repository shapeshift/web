import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { PortisHDWallet } from '@shapeshiftoss/hdwallet-portis'

import { GemManagerAction } from './const'
import { GemManagerState } from './state'
import { isSupportedBitcoinAsset, parseGemBuyAssets, parseGemSellAssets } from './utils'

export const reducer = (state: GemManagerState, action: Record<any, any>) => {
  switch (action.type) {
    case GemManagerAction.FETCH_STARTED:
      return {
        ...state,
        loading: true
      }
    case GemManagerAction.FETCH_COMPLETED:
      return {
        ...state,
        loading: false
      }
    case GemManagerAction.SELECT_ASSET:
      return {
        ...state,
        selectedAsset: action.selectedAsset
      }
    case GemManagerAction.SHOW_ON_DISPLAY:
      return {
        ...state,
        shownOnDisplay: action.shownOnDisplay
      }
    case GemManagerAction.SET_ETH_ADDRESS:
      return {
        ...state,
        ethAddress: action.ethAddress
      }
    case GemManagerAction.SET_BTC_ADDRESS:
      return {
        ...state,
        btcAddress: action.btcAddress
      }
    case GemManagerAction.SET_ENS_NAME:
      return {
        ...state,
        ensName: action.ensName
      }
    case GemManagerAction.SET_SUPPORTS_ADDRESS_VERIFYING:
      const { wallet } = action
      const supportsAddressVerifying = Boolean(
        (wallet as KeepKeyHDWallet)._isKeepKey || (wallet as PortisHDWallet)._isPortis
      )
      return {
        ...state,
        supportsAddressVerifying
      }
    case GemManagerAction.SET_COINIFY_ASSETS:
      return {
        ...state,
        coinifyAssets: action.coinifyAssets
      }
    case GemManagerAction.SET_WYRE_ASSETS:
      return {
        ...state,
        wyreAssets: action.wyreAssets
      }
    case GemManagerAction.SET_BUY_LIST:
      const buyList = parseGemBuyAssets(
        state.coinifyAssets,
        state.wyreAssets,
        action.balances,
        state.btcAddress
      )

      if (!buyList.length) return state

      return {
        ...state,
        buyList
      }
    case GemManagerAction.SET_SELL_LIST:
      const sellList = parseGemSellAssets(
        state.coinifyAssets,
        state.wyreAssets,
        action.balances,
        state.btcAddress
      )
      if (!sellList.length) return state

      return {
        ...state,
        sellList
      }
    case GemManagerAction.SET_FIAT_RAMP_ACTION:
      return {
        ...state,
        fiatRampAction: action.fiatRampAction
      }
    case GemManagerAction.SET_IS_SELECTING_ASSET:
      return {
        ...state,
        isSelectingAsset: action.isSelectingAsset
      }
    case GemManagerAction.SET_CHAIN_ADAPTER:
      return {
        ...state,
        chainAdapter: action.chainAdapter
      }
    case GemManagerAction.SET_IS_BTC:
      const isBTC = isSupportedBitcoinAsset(action.assetTicker) && action.btcAddress
      return {
        ...state,
        isBTC: isBTC
      }
    default:
      throw new Error('Todo')
  }
}
