import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { TransactionExecutionState } from '@shapeshiftoss/swapper'
import type { InterpolationOptions } from 'node-polyglot'

import {
    initialState,
    stopLossSubmissionInitialState,
    StopLossSubmissionState,
} from './constants'
import type {
    StopLossActiveQuote,
    StopLossOrder,
    StopLossOrderParams,
    StopLossState,
    StopLossSubmissionMetadata,
} from './types'

// Create a type-safe immer draft that will populate the orderSubmission object if undefined
const makeOrderSubmissionDraft = (
    orderSubmission: StopLossState['orderSubmission'],
    id: string,
): StopLossSubmissionMetadata => {
    if (!orderSubmission[id]) {
        orderSubmission[id] = stopLossSubmissionInitialState
    }
    return orderSubmission[id] as StopLossSubmissionMetadata
}

// Generate a unique order ID
const generateOrderId = (): string => {
    return `sl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const stopLossSlice = createSlice({
    name: 'stopLoss',
    initialState,
    reducers: create => ({
        clear: create.reducer(state => ({
            ...initialState,
            orderSubmission: state.orderSubmission,
        })),

        setActiveQuote: create.reducer(
            (state, action: PayloadAction<StopLossActiveQuote | undefined>) => {
                if (action.payload === undefined) {
                    state.activeQuote = undefined
                    return
                }
                state.activeQuote = action.payload
            },
        ),

        createOrder: create.reducer((state, action: PayloadAction<StopLossOrderParams>) => {
            const orderId = generateOrderId()
            const order: StopLossOrder = {
                id: orderId,
                params: action.payload,
                status: 'pending',
                createdAt: Date.now(),
            }
            state.orders[orderId] = order
            state.orderSubmission[orderId] = stopLossSubmissionInitialState
        }),

        setOrderStatus: create.reducer(
            (state, action: PayloadAction<{ orderId: string; status: StopLossOrder['status'] }>) => {
                const { orderId, status } = action.payload
                if (state.orders[orderId]) {
                    state.orders[orderId].status = status
                    if (status === 'triggered') {
                        state.orders[orderId].triggeredAt = Date.now()
                    }
                    if (status === 'executed') {
                        state.orders[orderId].executedAt = Date.now()
                    }
                }
            },
        ),

        cancelOrder: create.reducer((state, action: PayloadAction<string>) => {
            const orderId = action.payload
            if (state.orders[orderId]) {
                state.orders[orderId].status = 'cancelled'
            }
        }),

        removeOrder: create.reducer((state, action: PayloadAction<string>) => {
            delete state.orders[action.payload]
            delete state.orderSubmission[action.payload]
        }),

        setStopLossInitialized: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.state = StopLossSubmissionState.Previewing
        }),

        confirmSubmit: create.reducer((state, action: PayloadAction<string>) => {
            const orderId = action.payload

            if (!state.orders[orderId]) {
                console.error('Attempted to confirm a non-existent stop-loss order')
                return
            }

            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, orderId)

            if (draftOrderSubmission.state !== StopLossSubmissionState.Previewing) {
                console.error('Attempted to confirm an invalid stop-loss order state')
                return
            }

            const allowanceResetRequired = draftOrderSubmission.allowanceReset.isRequired
            const approvalRequired = draftOrderSubmission.allowanceApproval.isInitiallyRequired

            switch (true) {
                case allowanceResetRequired:
                    draftOrderSubmission.state = StopLossSubmissionState.AwaitingAllowanceReset
                    break
                case approvalRequired:
                    draftOrderSubmission.state = StopLossSubmissionState.AwaitingAllowanceApproval
                    break
                default:
                    draftOrderSubmission.state = StopLossSubmissionState.AwaitingStopLossSubmission
                    break
            }

            state.orders[orderId].status = 'active'
        }),

        setAllowanceResetTxPending: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.allowanceReset.state = TransactionExecutionState.Pending
        }),

        setAllowanceApprovalTxPending: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.allowanceApproval.state = TransactionExecutionState.Pending
        }),

        setAllowanceResetTxComplete: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.allowanceReset.state = TransactionExecutionState.Complete
        }),

        setAllowanceApprovalTxComplete: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.allowanceApproval.state = TransactionExecutionState.Complete
        }),

        setAllowanceResetStepComplete: create.reducer((state, action: PayloadAction<string>) => {
            const id = action.payload
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
            if (draftOrderSubmission.state !== StopLossSubmissionState.AwaitingAllowanceReset) {
                return
            }
            draftOrderSubmission.state = StopLossSubmissionState.AwaitingAllowanceApproval
        }),

        setAllowanceApprovalStepComplete: create.reducer((state, action: PayloadAction<string>) => {
            const id = action.payload
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
            if (draftOrderSubmission.state !== StopLossSubmissionState.AwaitingAllowanceApproval) {
                return
            }
            draftOrderSubmission.state = StopLossSubmissionState.AwaitingStopLossSubmission
        }),

        setStopLossTxPending: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.stopLossOrder.state = TransactionExecutionState.Pending
        }),

        setStopLossTxFailed: create.reducer((state, action: PayloadAction<string>) => {
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
            draftOrderSubmission.stopLossOrder.state = TransactionExecutionState.Failed
            if (state.orders[action.payload]) {
                state.orders[action.payload].status = 'failed'
            }
        }),

        setStopLossTxMessage: create.reducer(
            (
                state,
                action: PayloadAction<{
                    id: string
                    message: string | [string, InterpolationOptions] | undefined
                }>,
            ) => {
                const { id, message } = action.payload
                const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
                draftOrderSubmission.stopLossOrder.message = message
            },
        ),

        setStopLossTxComplete: create.reducer((state, action: PayloadAction<string>) => {
            const id = action.payload
            const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
            draftOrderSubmission.stopLossOrder.state = TransactionExecutionState.Complete
            draftOrderSubmission.stopLossOrder.message = undefined
            draftOrderSubmission.state = StopLossSubmissionState.Complete

            if (state.orders[id]) {
                state.orders[id].status = 'executed'
                state.orders[id].executedAt = Date.now()
            }
        }),

        setInitialApprovalRequirements: create.reducer(
            (
                state,
                action: PayloadAction<{
                    isAllowanceApprovalRequired: boolean | undefined
                    id: string
                }>,
            ) => {
                const draftOrderSubmission = makeOrderSubmissionDraft(
                    state.orderSubmission,
                    action.payload.id,
                )
                draftOrderSubmission.allowanceApproval.isRequired =
                    action.payload?.isAllowanceApprovalRequired
                draftOrderSubmission.allowanceApproval.isInitiallyRequired =
                    action.payload?.isAllowanceApprovalRequired
            },
        ),

        setAllowanceResetRequirements: create.reducer(
            (
                state,
                action: PayloadAction<{
                    isAllowanceResetRequired: boolean | undefined
                    id: string
                }>,
            ) => {
                const draftOrderSubmission = makeOrderSubmissionDraft(
                    state.orderSubmission,
                    action.payload.id,
                )
                draftOrderSubmission.allowanceReset.isRequired = action.payload?.isAllowanceResetRequired
                draftOrderSubmission.allowanceReset.isInitiallyRequired =
                    action.payload?.isAllowanceResetRequired
            },
        ),

        setExecutionTxHash: create.reducer(
            (state, action: PayloadAction<{ orderId: string; txHash: string }>) => {
                const { orderId, txHash } = action.payload
                if (state.orders[orderId]) {
                    state.orders[orderId].executionTxHash = txHash
                }
                const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, orderId)
                draftOrderSubmission.stopLossOrder.txHash = txHash
            },
        ),
    }),

    selectors: {
        selectActiveQuote: state => state.activeQuote,
        selectOrders: state => state.orders,
        selectOrderById: (state, orderId: string) => state.orders[orderId],
        selectActiveOrders: state =>
            Object.values(state.orders).filter(order => order.status === 'active'),
        selectOrderSubmission: (state, orderId: string) => state.orderSubmission[orderId],
    },
})
