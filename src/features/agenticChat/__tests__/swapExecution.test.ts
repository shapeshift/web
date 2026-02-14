import { describe, expect, it } from 'vitest'

import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import type { SwapState } from '../hooks/useSwapExecution'
import {
  persistedStateToSwapState,
  swapStateToPersistedState,
  SwapStep,
} from '../hooks/useSwapExecution'
import type { SwapOutput } from '../types/toolOutput'

const mockSwapOutput: SwapOutput = {
  summary: {
    sellAsset: {
      symbol: 'ETH',
      amount: '1.0',
      network: 'ethereum',
      chainName: 'Ethereum',
      valueUSD: '3000',
      priceUSD: '3000',
    },
    buyAsset: {
      symbol: 'USDC',
      estimatedAmount: '3000',
      network: 'ethereum',
      chainName: 'Ethereum',
      estimatedValueUSD: '3000',
      priceUSD: '1',
    },
    exchange: {
      provider: 'Uniswap',
      rate: '3000',
    },
    isCrossChain: false,
  },
  needsApproval: false,
  swapTx: {
    chainId: 'eip155:1',
    data: '0x',
    from: '0xabc',
    to: '0xdef',
    value: '0',
  },
  swapData: {
    sellAmountCryptoPrecision: '1000000000000000000',
    buyAmountCryptoPrecision: '3000000000',
    approvalTarget: '0x',
    sellAsset: {
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
      network: 'ethereum',
    },
    buyAsset: {
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: 'eip155:1',
      symbol: 'USDC',
      name: 'USD Coin',
      precision: 6,
      color: '#2775CA',
      icon: '',
      explorer: '',
      explorerTxLink: '',
      explorerAddressLink: '',
      network: 'ethereum',
    },
    sellAccount: '0xabc',
    buyAccount: '0xabc',
  },
}

describe('swapStateToPersistedState', () => {
  it('should serialize a successful swap state without approval', () => {
    const state: SwapState = {
      currentStep: SwapStep.COMPLETE,
      completedSteps: [SwapStep.QUOTE, SwapStep.SWAP],
      swapTxHash: '0xswaphash',
    }

    const persisted = swapStateToPersistedState('tool-1', 'conv-1', state, mockSwapOutput, true)

    expect(persisted.toolCallId).toBe('tool-1')
    expect(persisted.conversationId).toBe('conv-1')
    expect(persisted.toolType).toBe('swap')
    expect(persisted.phases).toEqual(['quote_complete', 'swap_complete'])
    expect(persisted.meta).toEqual({ swapTxHash: '0xswaphash' })
    expect(persisted.toolOutput).toBe(mockSwapOutput)
    expect(persisted.isTerminal).toBe(true)
    expect(typeof persisted.timestamp).toBe('number')
  })

  it('should serialize a successful swap state with approval', () => {
    const state: SwapState = {
      currentStep: SwapStep.COMPLETE,
      completedSteps: [
        SwapStep.QUOTE,
        SwapStep.APPROVAL,
        SwapStep.APPROVAL_CONFIRMATION,
        SwapStep.SWAP,
      ],
      approvalTxHash: '0xapprovalhash',
      swapTxHash: '0xswaphash',
    }

    const persisted = swapStateToPersistedState('tool-2', 'conv-1', state, mockSwapOutput, true)

    expect(persisted.phases).toEqual([
      'quote_complete',
      'approval_complete',
      'approval_confirmation_complete',
      'swap_complete',
    ])
    expect(persisted.meta).toEqual({
      approvalTxHash: '0xapprovalhash',
      swapTxHash: '0xswaphash',
    })
  })

  it('should serialize an error state', () => {
    const state: SwapState = {
      currentStep: SwapStep.SWAP,
      completedSteps: [SwapStep.QUOTE],
      error: 'Transaction reverted',
      failedStep: SwapStep.SWAP,
    }

    const persisted = swapStateToPersistedState('tool-3', 'conv-1', state, mockSwapOutput)

    expect(persisted.phases).toEqual(['quote_complete', 'error'])
    expect(persisted.meta).toEqual({
      error: 'Transaction reverted',
      failedStep: SwapStep.SWAP,
    })
    expect(persisted.isTerminal).toBeUndefined()
  })

  it('should omit toolOutput when null', () => {
    const state: SwapState = {
      currentStep: SwapStep.COMPLETE,
      completedSteps: [SwapStep.QUOTE, SwapStep.SWAP],
      swapTxHash: '0xswaphash',
    }

    const persisted = swapStateToPersistedState('tool-4', 'conv-1', state, null, true)

    expect(persisted.toolOutput).toBeUndefined()
  })

  it('should omit optional meta fields when not present', () => {
    const state: SwapState = {
      currentStep: SwapStep.QUOTE,
      completedSteps: [],
    }

    const persisted = swapStateToPersistedState('tool-5', 'conv-1', state, null)

    expect(persisted.meta).toEqual({})
    expect(persisted.phases).toEqual([])
  })
})

describe('persistedStateToSwapState', () => {
  it('should deserialize a successful swap state without approval', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-1',
      conversationId: 'conv-1',
      toolType: 'swap',
      timestamp: Date.now(),
      phases: ['quote_complete', 'swap_complete'],
      meta: { swapTxHash: '0xswaphash' },
      isTerminal: true,
    }

    const state = persistedStateToSwapState(persisted)

    expect(state.currentStep).toBe(SwapStep.COMPLETE)
    expect(state.completedSteps).toEqual([SwapStep.QUOTE, SwapStep.SWAP])
    expect(state.swapTxHash).toBe('0xswaphash')
    expect(state.approvalTxHash).toBeUndefined()
    expect(state.error).toBeUndefined()
    expect(state.failedStep).toBeUndefined()
  })

  it('should deserialize a successful swap state with approval', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-2',
      conversationId: 'conv-1',
      toolType: 'swap',
      timestamp: Date.now(),
      phases: [
        'quote_complete',
        'approval_complete',
        'approval_confirmation_complete',
        'swap_complete',
      ],
      meta: {
        approvalTxHash: '0xapprovalhash',
        swapTxHash: '0xswaphash',
      },
      isTerminal: true,
    }

    const state = persistedStateToSwapState(persisted)

    expect(state.currentStep).toBe(SwapStep.COMPLETE)
    expect(state.completedSteps).toEqual([
      SwapStep.QUOTE,
      SwapStep.APPROVAL,
      SwapStep.APPROVAL_CONFIRMATION,
      SwapStep.SWAP,
    ])
    expect(state.approvalTxHash).toBe('0xapprovalhash')
    expect(state.swapTxHash).toBe('0xswaphash')
  })

  it('should deserialize an error state', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-3',
      conversationId: 'conv-1',
      toolType: 'swap',
      timestamp: Date.now(),
      phases: ['quote_complete', 'error'],
      meta: {
        error: 'Transaction reverted',
        failedStep: SwapStep.SWAP,
      },
    }

    const state = persistedStateToSwapState(persisted)

    expect(state.currentStep).toBe(SwapStep.SWAP)
    expect(state.completedSteps).toEqual([SwapStep.QUOTE])
    expect(state.error).toBe('Transaction reverted')
    expect(state.failedStep).toBe(SwapStep.SWAP)
  })

  it('should handle empty phases', () => {
    const persisted: PersistedToolState = {
      toolCallId: 'tool-4',
      conversationId: 'conv-1',
      toolType: 'swap',
      timestamp: Date.now(),
      phases: [],
      meta: {},
    }

    const state = persistedStateToSwapState(persisted)

    expect(state.currentStep).toBe(SwapStep.COMPLETE)
    expect(state.completedSteps).toEqual([])
    expect(state.error).toBeUndefined()
  })
})

describe('swap serialization roundtrip', () => {
  it('should roundtrip a successful state without approval', () => {
    const originalState: SwapState = {
      currentStep: SwapStep.COMPLETE,
      completedSteps: [SwapStep.QUOTE, SwapStep.SWAP],
      swapTxHash: '0xswaphash',
    }

    const persisted = swapStateToPersistedState(
      'tool-1',
      'conv-1',
      originalState,
      mockSwapOutput,
      true,
    )
    const recoveredState = persistedStateToSwapState(persisted)

    expect(recoveredState.currentStep).toBe(SwapStep.COMPLETE)
    expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
    expect(recoveredState.swapTxHash).toBe(originalState.swapTxHash)
    expect(recoveredState.approvalTxHash).toBeUndefined()
    expect(recoveredState.error).toBeUndefined()
  })

  it('should roundtrip a successful state with approval', () => {
    const originalState: SwapState = {
      currentStep: SwapStep.COMPLETE,
      completedSteps: [
        SwapStep.QUOTE,
        SwapStep.APPROVAL,
        SwapStep.APPROVAL_CONFIRMATION,
        SwapStep.SWAP,
      ],
      approvalTxHash: '0xapprovalhash',
      swapTxHash: '0xswaphash',
    }

    const persisted = swapStateToPersistedState(
      'tool-2',
      'conv-1',
      originalState,
      mockSwapOutput,
      true,
    )
    const recoveredState = persistedStateToSwapState(persisted)

    expect(recoveredState.currentStep).toBe(SwapStep.COMPLETE)
    expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
    expect(recoveredState.approvalTxHash).toBe(originalState.approvalTxHash)
    expect(recoveredState.swapTxHash).toBe(originalState.swapTxHash)
  })

  it('should roundtrip an error state', () => {
    const originalState: SwapState = {
      currentStep: SwapStep.SWAP,
      completedSteps: [SwapStep.QUOTE, SwapStep.APPROVAL, SwapStep.APPROVAL_CONFIRMATION],
      approvalTxHash: '0xapprovalhash',
      error: 'Swap failed',
      failedStep: SwapStep.SWAP,
    }

    const persisted = swapStateToPersistedState('tool-3', 'conv-1', originalState, mockSwapOutput)
    const recoveredState = persistedStateToSwapState(persisted)

    expect(recoveredState.currentStep).toBe(SwapStep.SWAP)
    expect(recoveredState.completedSteps).toEqual(originalState.completedSteps)
    expect(recoveredState.approvalTxHash).toBe(originalState.approvalTxHash)
    expect(recoveredState.error).toBe(originalState.error)
    expect(recoveredState.failedStep).toBe(originalState.failedStep)
  })

  it('should roundtrip error state at approval step', () => {
    const originalState: SwapState = {
      currentStep: SwapStep.APPROVAL,
      completedSteps: [SwapStep.QUOTE],
      error: 'User rejected approval',
      failedStep: SwapStep.APPROVAL,
    }

    const persisted = swapStateToPersistedState('tool-4', 'conv-1', originalState, mockSwapOutput)
    const recoveredState = persistedStateToSwapState(persisted)

    expect(recoveredState.currentStep).toBe(SwapStep.APPROVAL)
    expect(recoveredState.completedSteps).toEqual([SwapStep.QUOTE])
    expect(recoveredState.error).toBe('User rejected approval')
    expect(recoveredState.failedStep).toBe(SwapStep.APPROVAL)
  })
})
