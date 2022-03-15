import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { PortisHDWallet } from '@shapeshiftoss/hdwallet-portis'

import { parseGemBuyAssets, parseGemSellAssets } from './utils'

export const reducer = (state: any, action: any) => {
  switch (action.type) {
    case 'FETCH_STARTED':
      return {
        ...state,
        loading: true
      }
    case 'FETCH_COMPLETED':
      return {
        ...state,
        loading: false
      }
    case 'SELECT_ASSET':
      return {
        ...state,
        selectedAsset: action.selectedAsset
      }
    case 'SHOW_ON_DISPLAY':
      return {
        ...state,
        shownOnDisplay: action.shownOnDisplay
      }
    case 'SET_ETH_ADDRESS':
      return {
        ...state,
        ethAddress: action.ethAddress
      }
    case 'SET_BTC_ADDRESS':
      return {
        ...state,
        btcAddress: action.btcAddress
      }
    case 'SET_ENS_NAME':
      return {
        ...state,
        ensName: action.ensName
      }
    case 'SET_SUPPORTS_ADDRESS_VERIFYING':
      const { wallet } = action
      const supportsAddressVerifying = Boolean(
        (wallet as KeepKeyHDWallet)._isKeepKey || (wallet as PortisHDWallet)._isPortis
      )
      return {
        ...state,
        supportsAddressVerifying
      }
    case 'SET_COINIFY_ASSETS':
      return {
        ...state,
        coinifyAssets: action.coinifyAssets
      }
    case 'SET_WYRE_ASSETS':
      return {
        ...state,
        wyreAssets: action.wyreAssets
      }
    case 'SET_BUY_LIST':
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
    case 'SET_SELL_LIST':
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
    case 'SET_FIAT_RAMP_ACTION':
      return {
        ...state,
        fiatRampAction: action.fiatRampAction
      }
    case 'SET_IS_SELECTING_ASSET':
      return {
        ...state,
        isSelectingAsset: action.isSelectingAsset
      }
    case 'SET_CHAIN_ADAPTER':
      return {
        ...state,
        chainAdapter: action.chainAdapter
      }
    default:
      throw new Error('Todo')
  }
}
