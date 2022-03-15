import { FiatRampAction } from './const'

export const initialState = {
  loading: false,
  selectedAsset: null,
  shownOnDisplay: false,
  ethAddress: '',
  btcAddress: '',
  supportsAddressVerifying: false,
  coinifyAssets: [],
  wyreAssets: [],
  chainAdapter: null,
  buyList: [],
  selList: [],
  fiatRampAction: FiatRampAction.Buy
}
