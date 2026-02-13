import { describe, it, expect } from 'vitest'
import type { SwapMachineContext, SwapMachineEvent } from '../types'
import { SwapStep } from '../types'
import type { SwapperName } from '../../types'

describe('SwapMachine Types', () => {
  it('SwapStep enum has all expected values', () => {
    expect(SwapStep.Idle).toBe('idle')
    expect(SwapStep.Input).toBe('input')
    expect(SwapStep.Quoting).toBe('quoting')
    expect(SwapStep.ApprovalNeeded).toBe('approval_needed')
    expect(SwapStep.Approving).toBe('approving')
    expect(SwapStep.Executing).toBe('executing')
    expect(SwapStep.PollingStatus).toBe('polling_status')
    expect(SwapStep.Complete).toBe('complete')
    expect(SwapStep.Error).toBe('error')
  })

  it('SwapStep enum has exactly 9 states', () => {
    const stepValues = Object.values(SwapStep)
    expect(stepValues).toHaveLength(9)
  })

  it('SwapMachineContext type is structurally valid', () => {
    const context: SwapMachineContext = {
      sellAsset: {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        symbol: 'ETH',
        name: 'Ethereum',
        precision: 18,
      },
      buyAsset: {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 'eip155:1',
        symbol: 'USDC',
        name: 'USD Coin',
        precision: 6,
      },
      sellAmount: '1.0',
      sellAmountBaseUnit: '1000000000000000000',
      selectedRate: null,
      quote: null,
      txHash: null,
      approvalTxHash: null,
      error: null,
      retryCount: 0,
      chainType: 'evm',
      slippage: '0.5',
      walletAddress: undefined,
      effectiveReceiveAddress: '0x1234567890abcdef1234567890abcdef12345678',
      isSellAssetEvm: true,
      isSellAssetUtxo: false,
      isSellAssetSolana: false,
      isBuyAssetEvm: true,
    }

    expect(context.sellAsset.symbol).toBe('ETH')
    expect(context.buyAsset.symbol).toBe('USDC')
    expect(context.chainType).toBe('evm')
    expect(context.retryCount).toBe(0)
  })

  it('SwapMachineEvent discriminated union covers all event types', () => {
    const events: SwapMachineEvent[] = [
      {
        type: 'SET_SELL_ASSET',
        asset: {
          assetId: 'eip155:1/slip44:60',
          chainId: 'eip155:1',
          symbol: 'ETH',
          name: 'Ethereum',
          precision: 18,
        },
      },
      {
        type: 'SET_BUY_ASSET',
        asset: {
          assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: 'eip155:1',
          symbol: 'USDC',
          name: 'USD Coin',
          precision: 6,
        },
      },
      { type: 'SET_SELL_AMOUNT', amount: '1.0', amountBaseUnit: '1000000000000000000' },
      { type: 'SET_SLIPPAGE', slippage: '1.0' },
      {
        type: 'SELECT_RATE',
        rate: {
          swapperName: 'THORChain' as SwapperName,
          rate: '1500',
          buyAmountCryptoBaseUnit: '1500000000',
          sellAmountCryptoBaseUnit: '1000000000000000000',
          steps: 1,
          affiliateBps: '0',
        },
      },
      { type: 'SWAP_TOKENS' },
      { type: 'FETCH_QUOTE' },
      { type: 'QUOTE_SUCCESS', quote: {} },
      { type: 'QUOTE_ERROR', error: 'No quotes available' },
      { type: 'APPROVE' },
      { type: 'APPROVAL_SUCCESS', txHash: '0xabc' },
      { type: 'APPROVAL_ERROR', error: 'Approval failed' },
      { type: 'EXECUTE' },
      { type: 'EXECUTE_SUCCESS', txHash: '0xdef' },
      { type: 'EXECUTE_ERROR', error: 'Execution failed' },
      { type: 'STATUS_CONFIRMED' },
      { type: 'STATUS_FAILED', error: 'Transaction reverted' },
      { type: 'RETRY' },
      { type: 'RESET' },
      { type: 'SET_WALLET_ADDRESS', address: '0x1234' },
      { type: 'SET_RECEIVE_ADDRESS', address: '0x5678' },
      {
        type: 'UPDATE_CHAIN_INFO',
        chainType: 'evm',
        isSellAssetEvm: true,
        isSellAssetUtxo: false,
        isSellAssetSolana: false,
        isBuyAssetEvm: true,
      },
    ]

    expect(events).toHaveLength(22)
    const eventTypes = events.map(e => e.type)
    expect(eventTypes).toContain('SET_SELL_ASSET')
    expect(eventTypes).toContain('RESET')
    expect(eventTypes).toContain('UPDATE_CHAIN_INFO')
  })

  it('chainType supports all chain types', () => {
    const chainTypes: SwapMachineContext['chainType'][] = ['evm', 'utxo', 'solana', 'cosmos', 'other']
    expect(chainTypes).toHaveLength(5)
  })
})
