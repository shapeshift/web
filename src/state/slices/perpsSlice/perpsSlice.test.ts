import { describe, expect, it } from 'vitest'

import type { ParsedOrderbook, ParsedPosition } from '@/lib/hyperliquid/types'
import { PerpsOrderSubmissionState, perpsSlice } from './perpsSlice'
import {
  selectHasOpenPositions,
  selectOrderbookMidPrice,
  selectOrderbookSpreadPercent,
  selectOrderFormPrice,
  selectOrderFormSide,
  selectOrderFormSize,
  selectOrderFormType,
  selectOrderSubmissionState,
  selectSelectedMarket,
} from './selectors'

describe('perpsSlice', () => {
  describe('reducers', () => {
    describe('setSelectedMarket', () => {
      it('should update selected market', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setSelectedMarket('BTC'),
        )

        expect(newState.selectedMarket).toBe('BTC')
      })

      it('should clear orderbook when market changes', () => {
        const stateWithOrderbook = {
          ...perpsSlice.getInitialState(),
          orderbook: { coin: 'ETH', bids: [], asks: [], time: 123 } as ParsedOrderbook,
        }

        const newState = perpsSlice.reducer(
          stateWithOrderbook,
          perpsSlice.actions.setSelectedMarket('BTC'),
        )

        expect(newState.orderbook).toBeNull()
      })
    })

    describe('setOrderbook', () => {
      it('should update orderbook state', () => {
        const initialState = perpsSlice.getInitialState()
        const orderbook: ParsedOrderbook = {
          coin: 'BTC',
          bids: [{ price: '50000', size: '1', total: '1' }],
          asks: [{ price: '50100', size: '1', total: '1' }],
          time: 1234567890,
        }

        const newState = perpsSlice.reducer(initialState, perpsSlice.actions.setOrderbook(orderbook))

        expect(newState.orderbook).toEqual(orderbook)
        expect(newState.orderbookLoading).toBe(false)
      })
    })

    describe('setOrderFormSide', () => {
      it('should update order form side', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(initialState, perpsSlice.actions.setOrderFormSide('A'))

        expect(newState.orderForm.side).toBe('A')
      })
    })

    describe('setOrderFormType', () => {
      it('should update order form type', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setOrderFormType('Market'),
        )

        expect(newState.orderForm.orderType).toBe('Market')
      })
    })

    describe('setOrderFormPrice', () => {
      it('should update order form price', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setOrderFormPrice('50000'),
        )

        expect(newState.orderForm.price).toBe('50000')
      })
    })

    describe('setOrderFormSize', () => {
      it('should update order form size', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setOrderFormSize('0.1'),
        )

        expect(newState.orderForm.size).toBe('0.1')
      })
    })

    describe('setOrderSubmissionState', () => {
      it('should update order submission state', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setOrderSubmissionState(PerpsOrderSubmissionState.Signing),
        )

        expect(newState.orderSubmission.state).toBe(PerpsOrderSubmissionState.Signing)
      })
    })

    describe('setOrderSubmissionError', () => {
      it('should set error and update state to Failed', () => {
        const initialState = perpsSlice.getInitialState()

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setOrderSubmissionError('Order failed'),
        )

        expect(newState.orderSubmission.error).toBe('Order failed')
        expect(newState.orderSubmission.state).toBe(PerpsOrderSubmissionState.Failed)
      })
    })

    describe('resetOrderForm', () => {
      it('should reset order form to initial state', () => {
        const modifiedState = {
          ...perpsSlice.getInitialState(),
          orderForm: {
            ...perpsSlice.getInitialState().orderForm,
            price: '50000',
            size: '0.5',
            leverage: 10,
          },
        }

        const newState = perpsSlice.reducer(modifiedState, perpsSlice.actions.resetOrderForm())

        expect(newState.orderForm.price).toBe('')
        expect(newState.orderForm.size).toBe('')
        expect(newState.orderForm.leverage).toBe(1)
      })
    })

    describe('setPositions', () => {
      it('should update positions', () => {
        const initialState = perpsSlice.getInitialState()
        const positions: ParsedPosition[] = [
          {
            coin: 'BTC',
            size: '0.1',
            side: 'Long',
            entryPrice: '50000',
            markPrice: '51000',
            liquidationPrice: '45000',
            unrealizedPnl: '100',
            unrealizedPnlPercent: '2',
            marginUsed: '5000',
            leverage: 10,
          },
        ]

        const newState = perpsSlice.reducer(
          initialState,
          perpsSlice.actions.setPositions(positions),
        )

        expect(newState.positions).toEqual(positions)
        expect(newState.positionsLoading).toBe(false)
      })
    })

    describe('clear', () => {
      it('should reset to initial state', () => {
        const modifiedState = {
          ...perpsSlice.getInitialState(),
          selectedMarket: 'BTC',
          positions: [{ coin: 'BTC' }] as ParsedPosition[],
        }

        const newState = perpsSlice.reducer(modifiedState, perpsSlice.actions.clear())

        expect(newState).toEqual(perpsSlice.getInitialState())
      })
    })
  })

  describe('selectors', () => {
    const createMockState = (perpsState = perpsSlice.getInitialState()) => ({
      perps: perpsState,
    })

    describe('selectSelectedMarket', () => {
      it('should return selected market', () => {
        const state = createMockState({
          ...perpsSlice.getInitialState(),
          selectedMarket: 'ETH',
        })

        expect(selectSelectedMarket(state as never)).toBe('ETH')
      })
    })

    describe('selectOrderFormType', () => {
      it('should return order form type', () => {
        const state = createMockState()

        expect(selectOrderFormType(state as never)).toBe('Limit')
      })
    })

    describe('selectOrderFormSide', () => {
      it('should return order form side', () => {
        const state = createMockState()

        expect(selectOrderFormSide(state as never)).toBe('B')
      })
    })

    describe('selectOrderFormPrice', () => {
      it('should return order form price', () => {
        const state = createMockState({
          ...perpsSlice.getInitialState(),
          orderForm: {
            ...perpsSlice.getInitialState().orderForm,
            price: '50000',
          },
        })

        expect(selectOrderFormPrice(state as never)).toBe('50000')
      })
    })

    describe('selectOrderFormSize', () => {
      it('should return order form size', () => {
        const state = createMockState({
          ...perpsSlice.getInitialState(),
          orderForm: {
            ...perpsSlice.getInitialState().orderForm,
            size: '0.5',
          },
        })

        expect(selectOrderFormSize(state as never)).toBe('0.5')
      })
    })

    describe('selectOrderSubmissionState', () => {
      it('should return order submission state', () => {
        const state = createMockState()

        expect(selectOrderSubmissionState(state as never)).toBe(PerpsOrderSubmissionState.Idle)
      })
    })

    describe('selectHasOpenPositions', () => {
      it('should return true when positions exist', () => {
        const state = createMockState({
          ...perpsSlice.getInitialState(),
          positions: [{ coin: 'BTC' }] as ParsedPosition[],
        })

        expect(selectHasOpenPositions(state as never)).toBe(true)
      })

      it('should return false when no positions', () => {
        const state = createMockState()

        expect(selectHasOpenPositions(state as never)).toBe(false)
      })
    })

    describe('selectOrderbookMidPrice', () => {
      it('should return mid price from orderbook', () => {
        const state = createMockState({
          ...perpsSlice.getInitialState(),
          orderbook: {
            coin: 'BTC',
            bids: [{ price: '50000', size: '1', total: '1' }],
            asks: [{ price: '50100', size: '1', total: '1' }],
            time: 123,
          },
        })

        expect(selectOrderbookMidPrice(state as never)).toBe('50050')
      })

      it('should return null when no orderbook', () => {
        const state = createMockState()

        expect(selectOrderbookMidPrice(state as never)).toBeNull()
      })
    })

    describe('selectOrderbookSpreadPercent', () => {
      it('should return spread percent from orderbook', () => {
        const state = createMockState({
          ...perpsSlice.getInitialState(),
          orderbook: {
            coin: 'BTC',
            bids: [{ price: '50000', size: '1', total: '1' }],
            asks: [{ price: '50100', size: '1', total: '1' }],
            time: 123,
          },
        })

        const spreadPercent = selectOrderbookSpreadPercent(state as never)

        expect(spreadPercent).toBeDefined()
        expect(parseFloat(spreadPercent as string)).toBeCloseTo(0.2, 1)
      })

      it('should return null when no orderbook', () => {
        const state = createMockState()

        expect(selectOrderbookSpreadPercent(state as never)).toBeNull()
      })
    })
  })
})
