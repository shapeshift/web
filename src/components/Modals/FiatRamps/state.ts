import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'

import { FiatRampAction } from './const'
import { GemCurrency, SupportedCurrency } from './FiatRamps'

export type GemManagerState = {
  loading: boolean
  selectedAsset: GemCurrency | null
  shownOnDisplay: Boolean | null
  ethAddress: string | null
  btcAddress: string | null
  ensName: string | null
  supportsAddressVerifying: boolean
  coinifyAssets: SupportedCurrency[]
  wyreAssets: SupportedCurrency[]
  chainAdapter: ChainAdapter<ChainTypes.Bitcoin | ChainTypes.Ethereum> | null
  buyList: GemCurrency[]
  sellList: GemCurrency[]
  fiatRampAction: FiatRampAction
  isBTC: boolean
}

export const initialState: GemManagerState = {
  loading: false,
  selectedAsset: null,
  shownOnDisplay: null,
  ethAddress: null,
  btcAddress: null,
  ensName: null,
  supportsAddressVerifying: false,
  coinifyAssets: [],
  wyreAssets: [],
  chainAdapter: null,
  buyList: [],
  sellList: [],
  fiatRampAction: FiatRampAction.Buy,
  isBTC: false
}
