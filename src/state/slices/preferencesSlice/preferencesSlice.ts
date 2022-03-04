import { createSlice } from '@reduxjs/toolkit'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  Yearn: boolean
  CosmosInvestor: boolean
  BitcoinPlugin: boolean
  CosmosPlugin: boolean
}

export type Preferences = {
  featureFlags: FeatureFlags
}

export const supportedAccountTypes = {
  [ChainTypes.Bitcoin]: [
    UtxoAccountType.SegwitNative,
    UtxoAccountType.SegwitP2sh,
    UtxoAccountType.P2pkh
  ],
  [ChainTypes.Ethereum]: undefined
}

const initialState: Preferences = {
  // TODO(0xdef1cafe): this whole thing needs to be deleted once we have the account -> address abstraction
  featureFlags: {
    Yearn: getConfig().REACT_APP_FEATURE_YEARN,
    CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR,
    BitcoinPlugin: getConfig().REACT_APP_FEATURE_PLUGIN_BITCOIN,
    CosmosPlugin: getConfig().REACT_APP_FEATURE_PLUGIN_COSMOS
  }
}

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setFeatureFlag(state, { payload }: { payload: { flag: keyof FeatureFlags; value: boolean } }) {
      state.featureFlags[payload.flag] = payload.value
    }
  }
})
