import { createSlice } from '@reduxjs/toolkit'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'

export type Preferences = {
  accountTypes: Record<ChainTypes, any>
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
  accountTypes: {
    [ChainTypes.Bitcoin]: UtxoAccountType.SegwitNative,
    [ChainTypes.Ethereum]: undefined
  }
}

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setAccountType(
      state,
      { payload }: { payload: { key: ChainTypes; value: UtxoAccountType | undefined } }
    ) {
      switch (payload.key) {
        case ChainTypes.Bitcoin: {
          state.accountTypes[ChainTypes.Bitcoin] = payload.value as UtxoAccountType
          break
        }
        default: {
          console.error(`preferences/setAccountType: unsupported chain ${payload.key}`)
        }
      }
    }
  }
})
