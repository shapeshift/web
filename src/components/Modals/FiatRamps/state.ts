import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'

import { FiatRampAction } from './const'
import { GemCurrency, SupportedCurrency } from './FiatRamps'

export type GemManagerState = {
  loading: Boolean
  selectedAsset: GemCurrency | null
  shownOnDisplay: Boolean
  ethAddress: string
  btcAddress: string | null
  supportsAddressVerifying: boolean
  coinifyAssets: SupportedCurrency[]
  wyreAssets: SupportedCurrency[]
  chainAdapter: ChainAdapter<ChainTypes.Bitcoin | ChainTypes.Ethereum> | null
  buyList: GemCurrency[]
  sellList: GemCurrency[]
  fiatRampAction: FiatRampAction
}

export const initialState: GemManagerState = {
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
  sellList: [],
  fiatRampAction: FiatRampAction.Buy
}
