import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

import type {
  AugmentedMarket,
  CandleInterval,
  ClearinghouseState,
  OpenOrder,
  OrderSide,
  OrderType,
  ParsedOrderbook,
  ParsedPosition,
  TimeInForce,
} from '@/lib/hyperliquid/types'

export enum PerpsOrderSubmissionState {
  Idle = 'Idle',
  Signing = 'Signing',
  Submitting = 'Submitting',
  Complete = 'Complete',
  Failed = 'Failed',
}

export type PerpsOrderFormState = {
  orderType: OrderType
  side: OrderSide
  price: string
  size: string
  leverage: number
  reduceOnly: boolean
  postOnly: boolean
  timeInForce: TimeInForce
  takeProfitPrice: string
  stopLossPrice: string
}

export type PerpsOrderSubmission = {
  state: PerpsOrderSubmissionState
  orderId: string | undefined
  error: string | undefined
}

export type PerpsState = {
  selectedMarket: string | null
  markets: AugmentedMarket[]
  marketsLoading: boolean
  marketsError: string | undefined
  orderbook: ParsedOrderbook | null
  orderbookLoading: boolean
  orderbookError: string | undefined
  positions: ParsedPosition[]
  positionsLoading: boolean
  positionsError: string | undefined
  openOrders: OpenOrder[]
  openOrdersLoading: boolean
  openOrdersError: string | undefined
  accountState: ClearinghouseState | null
  accountStateLoading: boolean
  accountStateError: string | undefined
  orderForm: PerpsOrderFormState
  orderSubmission: PerpsOrderSubmission
  chartInterval: CandleInterval
  isWalletInitialized: boolean
  walletAddress: string | undefined
  lastUpdateTimestamp: number | undefined
}

const initialOrderForm: PerpsOrderFormState = {
  orderType: 'Limit' as OrderType,
  side: 'B' as OrderSide,
  price: '',
  size: '',
  leverage: 1,
  reduceOnly: false,
  postOnly: false,
  timeInForce: 'Gtc' as TimeInForce,
  takeProfitPrice: '',
  stopLossPrice: '',
}

const initialOrderSubmission: PerpsOrderSubmission = {
  state: PerpsOrderSubmissionState.Idle,
  orderId: undefined,
  error: undefined,
}

const initialState: PerpsState = {
  selectedMarket: null,
  markets: [],
  marketsLoading: false,
  marketsError: undefined,
  orderbook: null,
  orderbookLoading: false,
  orderbookError: undefined,
  positions: [],
  positionsLoading: false,
  positionsError: undefined,
  openOrders: [],
  openOrdersLoading: false,
  openOrdersError: undefined,
  accountState: null,
  accountStateLoading: false,
  accountStateError: undefined,
  orderForm: initialOrderForm,
  orderSubmission: initialOrderSubmission,
  chartInterval: '1h' as CandleInterval,
  isWalletInitialized: false,
  walletAddress: undefined,
  lastUpdateTimestamp: undefined,
}

export const perpsSlice = createSlice({
  name: 'perps',
  initialState,
  reducers: create => ({
    clear: create.reducer(() => initialState),

    setSelectedMarket: create.reducer((state, action: PayloadAction<string | null>) => {
      state.selectedMarket = action.payload
      state.orderbook = null
      state.orderbookError = undefined
    }),

    setMarkets: create.reducer((state, action: PayloadAction<AugmentedMarket[]>) => {
      state.markets = action.payload
      state.marketsLoading = false
      state.marketsError = undefined
    }),

    setMarketsLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.marketsLoading = action.payload
    }),

    setMarketsError: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.marketsError = action.payload
      state.marketsLoading = false
    }),

    setOrderbook: create.reducer((state, action: PayloadAction<ParsedOrderbook | null>) => {
      state.orderbook = action.payload
      state.orderbookLoading = false
      state.orderbookError = undefined
      state.lastUpdateTimestamp = Date.now()
    }),

    setOrderbookLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.orderbookLoading = action.payload
    }),

    setOrderbookError: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.orderbookError = action.payload
      state.orderbookLoading = false
    }),

    setPositions: create.reducer((state, action: PayloadAction<ParsedPosition[]>) => {
      state.positions = action.payload
      state.positionsLoading = false
      state.positionsError = undefined
    }),

    setPositionsLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.positionsLoading = action.payload
    }),

    setPositionsError: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.positionsError = action.payload
      state.positionsLoading = false
    }),

    setOpenOrders: create.reducer((state, action: PayloadAction<OpenOrder[]>) => {
      state.openOrders = action.payload
      state.openOrdersLoading = false
      state.openOrdersError = undefined
    }),

    setOpenOrdersLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.openOrdersLoading = action.payload
    }),

    setOpenOrdersError: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.openOrdersError = action.payload
      state.openOrdersLoading = false
    }),

    setAccountState: create.reducer((state, action: PayloadAction<ClearinghouseState | null>) => {
      state.accountState = action.payload
      state.accountStateLoading = false
      state.accountStateError = undefined
    }),

    setAccountStateLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.accountStateLoading = action.payload
    }),

    setAccountStateError: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.accountStateError = action.payload
      state.accountStateLoading = false
    }),

    setOrderFormSide: create.reducer((state, action: PayloadAction<OrderSide>) => {
      state.orderForm.side = action.payload
    }),

    setOrderFormType: create.reducer((state, action: PayloadAction<OrderType>) => {
      state.orderForm.orderType = action.payload
    }),

    setOrderFormPrice: create.reducer((state, action: PayloadAction<string>) => {
      state.orderForm.price = action.payload
    }),

    setOrderFormSize: create.reducer((state, action: PayloadAction<string>) => {
      state.orderForm.size = action.payload
    }),

    setOrderFormLeverage: create.reducer((state, action: PayloadAction<number>) => {
      state.orderForm.leverage = action.payload
    }),

    setOrderFormReduceOnly: create.reducer((state, action: PayloadAction<boolean>) => {
      state.orderForm.reduceOnly = action.payload
    }),

    setOrderFormPostOnly: create.reducer((state, action: PayloadAction<boolean>) => {
      state.orderForm.postOnly = action.payload
    }),

    setOrderFormTimeInForce: create.reducer((state, action: PayloadAction<TimeInForce>) => {
      state.orderForm.timeInForce = action.payload
    }),

    setOrderFormTakeProfitPrice: create.reducer((state, action: PayloadAction<string>) => {
      state.orderForm.takeProfitPrice = action.payload
    }),

    setOrderFormStopLossPrice: create.reducer((state, action: PayloadAction<string>) => {
      state.orderForm.stopLossPrice = action.payload
    }),

    updateOrderForm: create.reducer(
      (state, action: PayloadAction<Partial<PerpsOrderFormState>>) => {
        state.orderForm = { ...state.orderForm, ...action.payload }
      },
    ),

    resetOrderForm: create.reducer(state => {
      state.orderForm = initialOrderForm
    }),

    setOrderSubmissionState: create.reducer(
      (state, action: PayloadAction<PerpsOrderSubmissionState>) => {
        state.orderSubmission.state = action.payload
      },
    ),

    setOrderSubmissionOrderId: create.reducer(
      (state, action: PayloadAction<string | undefined>) => {
        state.orderSubmission.orderId = action.payload
      },
    ),

    setOrderSubmissionError: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.orderSubmission.error = action.payload
      if (action.payload) {
        state.orderSubmission.state = PerpsOrderSubmissionState.Failed
      }
    }),

    setOrderSubmissionComplete: create.reducer((state, action: PayloadAction<string>) => {
      state.orderSubmission.state = PerpsOrderSubmissionState.Complete
      state.orderSubmission.orderId = action.payload
      state.orderSubmission.error = undefined
    }),

    resetOrderSubmission: create.reducer(state => {
      state.orderSubmission = initialOrderSubmission
    }),

    setChartInterval: create.reducer((state, action: PayloadAction<CandleInterval>) => {
      state.chartInterval = action.payload
    }),

    setWalletInitialized: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isWalletInitialized = action.payload
    }),

    setWalletAddress: create.reducer((state, action: PayloadAction<string | undefined>) => {
      state.walletAddress = action.payload
    }),

    clearWalletData: create.reducer(state => {
      state.positions = []
      state.openOrders = []
      state.accountState = null
      state.isWalletInitialized = false
      state.walletAddress = undefined
    }),
  }),
  selectors: {
    selectSelectedMarket: state => state.selectedMarket,
    selectMarkets: state => state.markets,
    selectMarketsLoading: state => state.marketsLoading,
    selectMarketsError: state => state.marketsError,
    selectOrderbook: state => state.orderbook,
    selectOrderbookLoading: state => state.orderbookLoading,
    selectOrderbookError: state => state.orderbookError,
    selectPositions: state => state.positions,
    selectPositionsLoading: state => state.positionsLoading,
    selectPositionsError: state => state.positionsError,
    selectOpenOrders: state => state.openOrders,
    selectOpenOrdersLoading: state => state.openOrdersLoading,
    selectOpenOrdersError: state => state.openOrdersError,
    selectAccountState: state => state.accountState,
    selectAccountStateLoading: state => state.accountStateLoading,
    selectAccountStateError: state => state.accountStateError,
    selectOrderForm: state => state.orderForm,
    selectOrderFormSide: state => state.orderForm.side,
    selectOrderFormType: state => state.orderForm.orderType,
    selectOrderFormPrice: state => state.orderForm.price,
    selectOrderFormSize: state => state.orderForm.size,
    selectOrderFormLeverage: state => state.orderForm.leverage,
    selectOrderSubmission: state => state.orderSubmission,
    selectOrderSubmissionState: state => state.orderSubmission.state,
    selectChartInterval: state => state.chartInterval,
    selectIsWalletInitialized: state => state.isWalletInitialized,
    selectWalletAddress: state => state.walletAddress,
    selectLastUpdateTimestamp: state => state.lastUpdateTimestamp,
    selectSelectedMarketData: state => {
      const market = state.selectedMarket
      if (!market) return undefined
      return state.markets.find(m => m.coin === market)
    },
    selectHasOpenPositions: state => state.positions.length > 0,
    selectHasOpenOrders: state => state.openOrders.length > 0,
    selectAccountValue: state => state.accountState?.marginSummary.accountValue,
    selectWithdrawable: state => state.accountState?.marginSummary.withdrawable,
    selectTotalMarginUsed: state => state.accountState?.marginSummary.totalMarginUsed,
  },
})
