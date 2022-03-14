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
      return {
        ...state,
        supportsAddressVerifying: action.supportsAddressVerifying
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
    default:
      throw new Error('Todo')
  }
}
