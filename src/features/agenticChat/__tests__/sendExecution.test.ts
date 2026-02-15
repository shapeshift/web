import { describe, expect, it } from 'vitest'

import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import type { SendState } from '../hooks/useSendExecution'
import {
  persistedStateToSendState,
  sendStateToPersistedState,
  SendStep,
} from '../hooks/useSendExecution'
import type { SendOutput } from '../types/toolOutput'

const mockSendOutput: SendOutput = {
  summary: {
    asset: 'Ethereum',
    symbol: 'ETH',
    amount: '1.0',
    from: '0xabc',
    to: '0xdef',
    network: 'ethereum',
    chainName: 'Ethereum',
    estimatedFeeCrypto: '0.001',
    estimatedFeeSymbol: 'ETH',
    estimatedFeeUsd: '3.00',
  },
  tx: {
    chainId: 'eip155:1',
    data: '0x',
    from: '0xabc',
    to: '0xdef',
    value: '1000000000000000000',
  },
  sendData: {
    assetId: 'eip155:1/slip44:60',
    from: '0xabc',
    to: '0xdef',
    amount: '1.0',
    chainId: 'eip155:1',
    asset: {
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      symbol: 'ETH',
      name: 'Ethereum',
      precision: 18,
      color: '#627EEA',
      icon: '',
      explorer: '',
      explorerTxLink: '',
      explorerAddressLink: '',
    },
  },
}

describe('sendStateToPersistedState', () => {
  it('should serialize a successful send state', () => {
    const state: SendState = {
      currentStep: SendStep.COMPLETE,
      completedSteps: [SendStep.PREPARATION, SendStep.SEND],
      sendTxHash: '0xsendhash',
    }

    const persisted = sendStateToPersistedState('tool-1', 'conv-1', state, mockSendOutput, true)

    expect(persisted.toolCallId).toBe('tool-1')
    expect(persisted.conversationId).toBe('conv-1')
    expect(persisted.toolType).toBe('send')
    expect(persisted.phases).toEqual(['preparation_complete', 'send_complete'])
    expect(persisted.meta).toEqual({ sendTxHash: '0xsendhash' })
    expect(persisted.toolOutput).toBe(mockSendOutput)
    expect(persisted.isTerminal).toBe(true)
    expect(typeof persisted.timestamp).toBe('number')
  })

  it('should serialize an error state', () => {
    const state: SendState = {
      currentStep: SendStep.SEND,
      completedSteps: [SendStep.PREPARATION],
      error: 'Insufficient funds',
      failedStep: SendStep.SEND,
    }

    const persisted = sendStateToPersistedState('tool-2', 'conv-1', state, mockSendOutput)

    expect(persisted.phases).toEqual(['preparation_complete', 'error'])
    expect(persisted.meta).toEqual({
      error: 'Insufficient funds',
      failedStep: SendStep.SEND,
    })
    expect(persisted.isTerminal).toBeUndefined()
  })

  it('should omit toolOutput when null', () => {
    const state: SendState = {
      currentStep: SendStep.COMPLETE,
      completedSteps: [SendStep.PREPARATION, SendStep.SEND],
      sendTxHash: '0xsendhash',
    }

    const persisted = sendStateToPersistedState('tool-3', 'conv-1', state, null, true)

    expect(persisted.toolOutput).toBeUndefined()
  })

  it('should omit optional meta fields when not present', () => {
    const state: SendState = {
      currentStep: SendStep.PREPARATION,
      completedSteps: [],
    }

    const persisted = sendStateToPersistedState('tool-4', 'conv-1', state, null)

    expect(persisted.meta).toEqual({})
    expect(persisted.phases).toEqual([])
  })

  it('should serialize error at preparation step', () => {
    const state: SendState = {
      currentStep: SendStep.PREPARATION,
      completedSteps: [],
      error: 'No wallet connected',
      failedStep: SendStep.PREPARATION,
    }

    const persisted = sendStateToPersistedState('tool-5', 'conv-1', state, mockSendOutput)

    expect(persisted.phases).toEqual(['error'])
    expect(persisted.meta).toEqual({
      error: 'No wallet connected',
      failedStep: SendStep.PREPARATION,
    })
  })
})

describe('persistedStateToSendState', () => {
  it('should deserialize a successful send state', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-1',
      conversationId: 'conv-1',
      toolType: 'send',
      timestamp: Date.now(),
      phases: ['preparation_complete', 'send_complete'],
      meta: { sendTxHash: '0xsendhash' },
      isTerminal: true,
    }

    const state = persistedStateToSendState(persisted)

    expect(state.currentStep).toBe(SendStep.COMPLETE)
    expect(state.completedSteps).toEqual([SendStep.PREPARATION, SendStep.SEND])
    expect(state.sendTxHash).toBe('0xsendhash')
    expect(state.error).toBeUndefined()
    expect(state.failedStep).toBeUndefined()
  })

  it('should deserialize an error state', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-2',
      conversationId: 'conv-1',
      toolType: 'send',
      timestamp: Date.now(),
      phases: ['preparation_complete', 'error'],
      meta: {
        error: 'Insufficient funds',
        failedStep: SendStep.SEND,
      },
    }

    const state = persistedStateToSendState(persisted)

    expect(state.currentStep).toBe(SendStep.SEND)
    expect(state.completedSteps).toEqual([SendStep.PREPARATION])
    expect(state.error).toBe('Insufficient funds')
    expect(state.failedStep).toBe(SendStep.SEND)
  })

  it('should handle empty phases', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-3',
      conversationId: 'conv-1',
      toolType: 'send',
      timestamp: Date.now(),
      phases: [],
      meta: {},
    }

    const state = persistedStateToSendState(persisted)

    expect(state.currentStep).toBe(SendStep.COMPLETE)
    expect(state.completedSteps).toEqual([])
    expect(state.error).toBeUndefined()
  })
})

describe('send serialization roundtrip', () => {
  it('should roundtrip a successful state', () => {
    const originalState: SendState = {
      currentStep: SendStep.COMPLETE,
      completedSteps: [SendStep.PREPARATION, SendStep.SEND],
      sendTxHash: '0xsendhash',
    }

    const persisted = sendStateToPersistedState(
      'tool-1',
      'conv-1',
      originalState,
      mockSendOutput,
      true,
    )
    const recoveredState = persistedStateToSendState(persisted)

    expect(recoveredState.currentStep).toBe(SendStep.COMPLETE)
    expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
    expect(recoveredState.sendTxHash).toBe(originalState.sendTxHash)
    expect(recoveredState.error).toBeUndefined()
  })

  it('should roundtrip an error state', () => {
    const originalState: SendState = {
      currentStep: SendStep.SEND,
      completedSteps: [SendStep.PREPARATION],
      error: 'Transaction failed',
      failedStep: SendStep.SEND,
    }

    const persisted = sendStateToPersistedState('tool-2', 'conv-1', originalState, mockSendOutput)
    const recoveredState = persistedStateToSendState(persisted)

    expect(recoveredState.currentStep).toBe(SendStep.SEND)
    expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
    expect(recoveredState.error).toBe(originalState.error)
    expect(recoveredState.failedStep).toBe(originalState.failedStep)
  })

  it('should roundtrip error at preparation step', () => {
    const originalState: SendState = {
      currentStep: SendStep.PREPARATION,
      completedSteps: [],
      error: 'No wallet',
      failedStep: SendStep.PREPARATION,
    }

    const persisted = sendStateToPersistedState('tool-3', 'conv-1', originalState, null)
    const recoveredState = persistedStateToSendState(persisted)

    expect(recoveredState.currentStep).toBe(SendStep.PREPARATION)
    expect(recoveredState.completedSteps).toEqual([])
    expect(recoveredState.error).toBe('No wallet')
    expect(recoveredState.failedStep).toBe(SendStep.PREPARATION)
  })
})
