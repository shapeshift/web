import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { StopLossTriggerType } from '../stopLossSlice/types'

export type StopLossInputState = {
    sellAssetId: AssetId | undefined
    buyAssetId: AssetId | undefined
    sellAmountCryptoPrecision: string
    sellAccountId: AccountId | undefined
    triggerType: StopLossTriggerType
    triggerValue: string
    currentPrice: string
    isConfirming: boolean
}

const initialState: StopLossInputState = {
    sellAssetId: undefined,
    buyAssetId: undefined,
    sellAmountCryptoPrecision: '0',
    sellAccountId: undefined,
    triggerType: 'percentage',
    triggerValue: '10',
    currentPrice: '0',
    isConfirming: false,
}

export const stopLossInputSlice = createSlice({
    name: 'stopLossInput',
    initialState,
    reducers: {
        reset: () => initialState,

        setSellAssetId: (state, action: PayloadAction<AssetId | undefined>) => {
            state.sellAssetId = action.payload
        },

        setBuyAssetId: (state, action: PayloadAction<AssetId | undefined>) => {
            state.buyAssetId = action.payload
        },

        setSellAmountCryptoPrecision: (state, action: PayloadAction<string>) => {
            state.sellAmountCryptoPrecision = bnOrZero(action.payload).toString()
        },

        setSellAccountId: (state, action: PayloadAction<AccountId | undefined>) => {
            state.sellAccountId = action.payload
        },

        setTriggerType: (state, action: PayloadAction<StopLossTriggerType>) => {
            state.triggerType = action.payload
        },

        setTriggerValue: (state, action: PayloadAction<string>) => {
            state.triggerValue = action.payload
        },

        setCurrentPrice: (state, action: PayloadAction<string>) => {
            state.currentPrice = action.payload
        },

        setIsConfirming: (state, action: PayloadAction<boolean>) => {
            state.isConfirming = action.payload
        },
    },

    selectors: {
        selectSellAssetId: state => state.sellAssetId,
        selectBuyAssetId: state => state.buyAssetId,
        selectSellAmountCryptoPrecision: state => state.sellAmountCryptoPrecision,
        selectSellAccountId: state => state.sellAccountId,
        selectTriggerType: state => state.triggerType,
        selectTriggerValue: state => state.triggerValue,
        selectCurrentPrice: state => state.currentPrice,
        selectIsConfirming: state => state.isConfirming,
    },
})

export const stopLossInputActions = stopLossInputSlice.actions
export const stopLossInputSelectors = stopLossInputSlice.selectors
