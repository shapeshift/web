import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'

export type GemManagerState = {
  supportsAddressVerifying: boolean
  chainAdapter: ChainAdapter<ChainTypes.Bitcoin | ChainTypes.Ethereum> | null
  shownOnDisplay: boolean | null
}

export const initialState: GemManagerState = {
  supportsAddressVerifying: false,
  chainAdapter: null,
  shownOnDisplay: null
}
