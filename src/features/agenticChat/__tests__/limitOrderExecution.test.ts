import { describe, expect, it } from 'vitest'

import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import type { CancelLimitOrderState } from '../hooks/useCancelLimitOrderExecution'
import {
  CancelLimitOrderStep,
  persistedStateToState as cancelPersistedStateToState,
  stateToPersistedState as cancelStateToPersistedState,
} from '../hooks/useCancelLimitOrderExecution'
import type { CreateLimitOrderState } from '../hooks/useCreateLimitOrderExecution'
import {
  CreateLimitOrderStep,
  persistedStateToState as createPersistedStateToState,
  stateToPersistedState as createStateToPersistedState,
} from '../hooks/useCreateLimitOrderExecution'
import type { CancelLimitOrderOutput, CreateLimitOrderOutput } from '../types/toolOutput'

const mockCreateLimitOrderOutput: CreateLimitOrderOutput = {
  summary: {
    sellAsset: { symbol: 'ETH', amount: '1.0' },
    buyAsset: { symbol: 'USDC', estimatedAmount: '3000' },
    network: 'ethereum',
    limitPrice: '3000',
    expiresAt: '2026-03-01T00:00:00Z',
    provider: 'CoW Protocol',
  },
  signingData: {},
  orderParams: {
    sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    sellAmount: '1000000000000000000',
    buyAmount: '3000000000',
    validTo: 1740787200,
    receiver: '0xabc123',
    chainId: 1,
  },
  needsApproval: false,
  approvalTarget: '0x',
  trackingUrl: 'https://explorer.cow.fi/orders/0x123',
}

const mockCancelLimitOrderOutput: CancelLimitOrderOutput = {
  orderId: '0xorder123',
  chainId: 1,
  network: 'ethereum',
  signingData: {
    domain: {},
    types: { OrderCancellations: [{ name: 'orderUids', type: 'bytes[]' }] },
    primaryType: 'OrderCancellations',
    message: { orderUids: ['0xorder123'] },
  },
  trackingUrl: 'https://explorer.cow.fi/orders/0xorder123',
}

describe('Create Limit Order', () => {
  describe('stateToPersistedState', () => {
    it('should serialize a successful state without approval', () => {
      const state: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.COMPLETE,
        completedSteps: [
          CreateLimitOrderStep.PREPARE,
          CreateLimitOrderStep.SIGN,
          CreateLimitOrderStep.SUBMIT,
        ],
        signature: '0xsig123',
        trackingUrl: 'https://explorer.cow.fi/orders/0x123',
      }

      const persisted = createStateToPersistedState(
        'tool-1',
        'conv-1',
        state,
        mockCreateLimitOrderOutput,
        true,
      )

      expect(persisted.toolCallId).toBe('tool-1')
      expect(persisted.conversationId).toBe('conv-1')
      expect(persisted.toolType).toBe('limit_order')
      expect(persisted.phases).toEqual(['preparation_complete', 'sign_complete', 'submit_complete'])
      expect(persisted.meta).toEqual({
        signature: '0xsig123',
        trackingUrl: 'https://explorer.cow.fi/orders/0x123',
      })
      expect(persisted.toolOutput).toBe(mockCreateLimitOrderOutput)
      expect(persisted.isTerminal).toBe(true)
    })

    it('should serialize a successful state with approval', () => {
      const state: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.COMPLETE,
        completedSteps: [
          CreateLimitOrderStep.PREPARE,
          CreateLimitOrderStep.APPROVAL,
          CreateLimitOrderStep.APPROVAL_CONFIRMATION,
          CreateLimitOrderStep.SIGN,
          CreateLimitOrderStep.SUBMIT,
        ],
        approvalTxHash: '0xapprovalhash',
        signature: '0xsig123',
        trackingUrl: 'https://explorer.cow.fi/orders/0x123',
      }

      const persisted = createStateToPersistedState(
        'tool-2',
        'conv-1',
        state,
        mockCreateLimitOrderOutput,
        true,
      )

      expect(persisted.phases).toEqual([
        'preparation_complete',
        'approval_complete',
        'approval_confirmation_complete',
        'sign_complete',
        'submit_complete',
      ])
      expect(persisted.meta).toEqual({
        approvalTxHash: '0xapprovalhash',
        signature: '0xsig123',
        trackingUrl: 'https://explorer.cow.fi/orders/0x123',
      })
    })

    it('should serialize an error state', () => {
      const state: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.SIGN,
        completedSteps: [CreateLimitOrderStep.PREPARE],
        error: 'User rejected signing',
        failedStep: CreateLimitOrderStep.SIGN,
      }

      const persisted = createStateToPersistedState(
        'tool-3',
        'conv-1',
        state,
        mockCreateLimitOrderOutput,
      )

      expect(persisted.phases).toEqual(['preparation_complete', 'error'])
      expect(persisted.meta).toEqual({
        error: 'User rejected signing',
        failedStep: CreateLimitOrderStep.SIGN,
      })
      expect(persisted.isTerminal).toBeUndefined()
    })

    it('should omit toolOutput when null', () => {
      const state: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.PREPARE,
        completedSteps: [],
      }

      const persisted = createStateToPersistedState('tool-4', 'conv-1', state, null)

      expect(persisted.toolOutput).toBeUndefined()
    })

    it('should omit optional meta fields when not present', () => {
      const state: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.PREPARE,
        completedSteps: [],
      }

      const persisted = createStateToPersistedState('tool-5', 'conv-1', state, null)

      expect(persisted.meta).toEqual({})
    })
  })

  describe('persistedStateToState', () => {
    it('should deserialize a successful state without approval', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-1',
        conversationId: 'conv-1',
        toolType: 'limit_order',
        timestamp: Date.now(),
        phases: ['preparation_complete', 'sign_complete', 'submit_complete'],
        meta: {
          signature: '0xsig123',
          trackingUrl: 'https://explorer.cow.fi/orders/0x123',
        },
        isTerminal: true,
      }

      const state = createPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CreateLimitOrderStep.COMPLETE)
      expect(state.completedSteps).toEqual([
        CreateLimitOrderStep.PREPARE,
        CreateLimitOrderStep.SIGN,
        CreateLimitOrderStep.SUBMIT,
      ])
      expect(state.signature).toBe('0xsig123')
      expect(state.trackingUrl).toBe('https://explorer.cow.fi/orders/0x123')
      expect(state.approvalTxHash).toBeUndefined()
      expect(state.error).toBeUndefined()
    })

    it('should deserialize a successful state with approval', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-2',
        conversationId: 'conv-1',
        toolType: 'limit_order',
        timestamp: Date.now(),
        phases: [
          'preparation_complete',
          'approval_complete',
          'approval_confirmation_complete',
          'sign_complete',
          'submit_complete',
        ],
        meta: {
          approvalTxHash: '0xapprovalhash',
          signature: '0xsig123',
          trackingUrl: 'https://explorer.cow.fi/orders/0x123',
        },
        isTerminal: true,
      }

      const state = createPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CreateLimitOrderStep.COMPLETE)
      expect(state.completedSteps).toEqual([
        CreateLimitOrderStep.PREPARE,
        CreateLimitOrderStep.APPROVAL,
        CreateLimitOrderStep.APPROVAL_CONFIRMATION,
        CreateLimitOrderStep.SIGN,
        CreateLimitOrderStep.SUBMIT,
      ])
      expect(state.approvalTxHash).toBe('0xapprovalhash')
      expect(state.signature).toBe('0xsig123')
      expect(state.trackingUrl).toBe('https://explorer.cow.fi/orders/0x123')
    })

    it('should deserialize an error state', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-3',
        conversationId: 'conv-1',
        toolType: 'limit_order',
        timestamp: Date.now(),
        phases: ['preparation_complete', 'error'],
        meta: {
          error: 'User rejected signing',
          failedStep: CreateLimitOrderStep.SIGN,
        },
      }

      const state = createPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CreateLimitOrderStep.SIGN)
      expect(state.completedSteps).toEqual([CreateLimitOrderStep.PREPARE])
      expect(state.error).toBe('User rejected signing')
    })

    it('should handle empty phases', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-4',
        conversationId: 'conv-1',
        toolType: 'limit_order',
        timestamp: Date.now(),
        phases: [],
        meta: {},
      }

      const state = createPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CreateLimitOrderStep.COMPLETE)
      expect(state.completedSteps).toEqual([])
      expect(state.error).toBeUndefined()
    })
  })

  describe('roundtrip', () => {
    it('should roundtrip a successful state without approval', () => {
      const originalState: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.COMPLETE,
        completedSteps: [
          CreateLimitOrderStep.PREPARE,
          CreateLimitOrderStep.SIGN,
          CreateLimitOrderStep.SUBMIT,
        ],
        signature: '0xsig123',
        trackingUrl: 'https://explorer.cow.fi/orders/0x123',
      }

      const persisted = createStateToPersistedState(
        'tool-1',
        'conv-1',
        originalState,
        mockCreateLimitOrderOutput,
        true,
      )
      const recoveredState = createPersistedStateToState(persisted)

      expect(recoveredState.currentStep).toBe(CreateLimitOrderStep.COMPLETE)
      expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
      expect(recoveredState.signature).toBe(originalState.signature)
      expect(recoveredState.trackingUrl).toBe(originalState.trackingUrl)
      expect(recoveredState.error).toBeUndefined()
    })

    it('should roundtrip a successful state with approval', () => {
      const originalState: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.COMPLETE,
        completedSteps: [
          CreateLimitOrderStep.PREPARE,
          CreateLimitOrderStep.APPROVAL,
          CreateLimitOrderStep.APPROVAL_CONFIRMATION,
          CreateLimitOrderStep.SIGN,
          CreateLimitOrderStep.SUBMIT,
        ],
        approvalTxHash: '0xapprovalhash',
        signature: '0xsig123',
        trackingUrl: 'https://explorer.cow.fi/orders/0x123',
      }

      const persisted = createStateToPersistedState(
        'tool-2',
        'conv-1',
        originalState,
        mockCreateLimitOrderOutput,
        true,
      )
      const recoveredState = createPersistedStateToState(persisted)

      expect(recoveredState.currentStep).toBe(CreateLimitOrderStep.COMPLETE)
      expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
      expect(recoveredState.approvalTxHash).toBe(originalState.approvalTxHash)
      expect(recoveredState.signature).toBe(originalState.signature)
      expect(recoveredState.trackingUrl).toBe(originalState.trackingUrl)
    })

    it('should roundtrip an error state at submit step', () => {
      const originalState: CreateLimitOrderState = {
        currentStep: CreateLimitOrderStep.SUBMIT,
        completedSteps: [CreateLimitOrderStep.PREPARE, CreateLimitOrderStep.SIGN],
        signature: '0xsig123',
        error: 'Order submission failed',
        failedStep: CreateLimitOrderStep.SUBMIT,
      }

      const persisted = createStateToPersistedState(
        'tool-3',
        'conv-1',
        originalState,
        mockCreateLimitOrderOutput,
      )
      const recoveredState = createPersistedStateToState(persisted)

      expect(recoveredState.currentStep).toBe(CreateLimitOrderStep.SUBMIT)
      expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
      expect(recoveredState.signature).toBe(originalState.signature)
      expect(recoveredState.error).toBe(originalState.error)
    })
  })
})

describe('Cancel Limit Order', () => {
  describe('stateToPersistedState', () => {
    it('should serialize a successful cancel state', () => {
      const state: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.COMPLETE,
        completedSteps: [
          CancelLimitOrderStep.PREPARE,
          CancelLimitOrderStep.SIGN,
          CancelLimitOrderStep.SUBMIT,
        ],
        signature: '0xcancelsig',
      }

      const persisted = cancelStateToPersistedState(
        'tool-1',
        'conv-1',
        state,
        mockCancelLimitOrderOutput,
        true,
      )

      expect(persisted.toolCallId).toBe('tool-1')
      expect(persisted.conversationId).toBe('conv-1')
      expect(persisted.toolType).toBe('cancel_limit_order')
      expect(persisted.phases).toEqual(['preparation_complete', 'sign_complete', 'submit_complete'])
      expect(persisted.meta).toEqual({ signature: '0xcancelsig' })
      expect(persisted.toolOutput).toBe(mockCancelLimitOrderOutput)
      expect(persisted.isTerminal).toBe(true)
    })

    it('should serialize an error state', () => {
      const state: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.SIGN,
        completedSteps: [CancelLimitOrderStep.PREPARE],
        error: 'User rejected cancellation',
        failedStep: CancelLimitOrderStep.SIGN,
      }

      const persisted = cancelStateToPersistedState(
        'tool-2',
        'conv-1',
        state,
        mockCancelLimitOrderOutput,
      )

      expect(persisted.phases).toEqual(['preparation_complete', 'error'])
      expect(persisted.meta).toEqual({
        error: 'User rejected cancellation',
        failedStep: CancelLimitOrderStep.SIGN,
      })
      expect(persisted.isTerminal).toBeUndefined()
    })

    it('should omit toolOutput when null', () => {
      const state: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.PREPARE,
        completedSteps: [],
      }

      const persisted = cancelStateToPersistedState('tool-3', 'conv-1', state, null)

      expect(persisted.toolOutput).toBeUndefined()
    })

    it('should omit optional meta fields when not present', () => {
      const state: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.PREPARE,
        completedSteps: [],
      }

      const persisted = cancelStateToPersistedState('tool-4', 'conv-1', state, null)

      expect(persisted.meta).toEqual({})
    })
  })

  describe('persistedStateToState', () => {
    it('should deserialize a successful cancel state', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-1',
        conversationId: 'conv-1',
        toolType: 'cancel_limit_order',
        timestamp: Date.now(),
        phases: ['preparation_complete', 'sign_complete', 'submit_complete'],
        meta: { signature: '0xcancelsig' },
        isTerminal: true,
      }

      const state = cancelPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CancelLimitOrderStep.COMPLETE)
      expect(state.completedSteps).toEqual([
        CancelLimitOrderStep.PREPARE,
        CancelLimitOrderStep.SIGN,
        CancelLimitOrderStep.SUBMIT,
      ])
      expect(state.signature).toBe('0xcancelsig')
      expect(state.error).toBeUndefined()
      expect(state.failedStep).toBeUndefined()
    })

    it('should deserialize an error state', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-2',
        conversationId: 'conv-1',
        toolType: 'cancel_limit_order',
        timestamp: Date.now(),
        phases: ['preparation_complete', 'error'],
        meta: {
          error: 'Cancel failed',
          failedStep: CancelLimitOrderStep.SIGN,
        },
      }

      const state = cancelPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CancelLimitOrderStep.SIGN)
      expect(state.completedSteps).toEqual([CancelLimitOrderStep.PREPARE])
      expect(state.error).toBe('Cancel failed')
      expect(state.failedStep).toBe(CancelLimitOrderStep.SIGN)
    })

    it('should handle empty phases', () => {
      const persisted: PersistedToolState = {
        toolCallId: 'tool-3',
        conversationId: 'conv-1',
        toolType: 'cancel_limit_order',
        timestamp: Date.now(),
        phases: [],
        meta: {},
      }

      const state = cancelPersistedStateToState(persisted)

      expect(state.currentStep).toBe(CancelLimitOrderStep.COMPLETE)
      expect(state.completedSteps).toEqual([])
      expect(state.error).toBeUndefined()
    })
  })

  describe('roundtrip', () => {
    it('should roundtrip a successful cancel state', () => {
      const originalState: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.COMPLETE,
        completedSteps: [
          CancelLimitOrderStep.PREPARE,
          CancelLimitOrderStep.SIGN,
          CancelLimitOrderStep.SUBMIT,
        ],
        signature: '0xcancelsig',
      }

      const persisted = cancelStateToPersistedState(
        'tool-1',
        'conv-1',
        originalState,
        mockCancelLimitOrderOutput,
        true,
      )
      const recoveredState = cancelPersistedStateToState(persisted)

      expect(recoveredState.currentStep).toBe(CancelLimitOrderStep.COMPLETE)
      expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
      expect(recoveredState.signature).toBe(originalState.signature)
      expect(recoveredState.error).toBeUndefined()
    })

    it('should roundtrip an error state at sign step', () => {
      const originalState: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.SIGN,
        completedSteps: [CancelLimitOrderStep.PREPARE],
        error: 'User rejected',
        failedStep: CancelLimitOrderStep.SIGN,
      }

      const persisted = cancelStateToPersistedState(
        'tool-2',
        'conv-1',
        originalState,
        mockCancelLimitOrderOutput,
      )
      const recoveredState = cancelPersistedStateToState(persisted)

      expect(recoveredState.currentStep).toBe(CancelLimitOrderStep.SIGN)
      expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
      expect(recoveredState.error).toBe(originalState.error)
      expect(recoveredState.failedStep).toBe(originalState.failedStep)
    })

    it('should roundtrip an error state at submit step', () => {
      const originalState: CancelLimitOrderState = {
        currentStep: CancelLimitOrderStep.SUBMIT,
        completedSteps: [CancelLimitOrderStep.PREPARE, CancelLimitOrderStep.SIGN],
        signature: '0xcancelsig',
        error: 'API error',
        failedStep: CancelLimitOrderStep.SUBMIT,
      }

      const persisted = cancelStateToPersistedState(
        'tool-3',
        'conv-1',
        originalState,
        mockCancelLimitOrderOutput,
      )
      const recoveredState = cancelPersistedStateToState(persisted)

      expect(recoveredState.currentStep).toBe(CancelLimitOrderStep.SUBMIT)
      expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
      expect(recoveredState.signature).toBe(originalState.signature)
      expect(recoveredState.error).toBe(originalState.error)
      expect(recoveredState.failedStep).toBe(originalState.failedStep)
    })
  })
})
