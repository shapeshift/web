import { describe, expect, it } from 'vitest'

import {
  selectWalletActions,
  selectWalletActionsSorted,
  selectWalletClaimActions,
  selectWalletRecentActions,
  selectYieldActionsByTxHash,
} from './selectors'
import type { ActionState, ArbitrumBridgeWithdrawAction, GenericTransactionAction } from './types'
import { ActionStatus, ActionType, GenericTransactionDisplayType } from './types'

const mockYieldDepositAction: GenericTransactionAction = {
  id: 'uuid-1',
  type: ActionType.Deposit,
  status: ActionStatus.Complete,
  createdAt: 1700000000000,
  updatedAt: 1700000001000,
  transactionMetadata: {
    displayType: GenericTransactionDisplayType.Yield,
    txHash: '0xabc123',
    chainId: 'eip155:1',
    assetId: 'eip155:1/slip44:60',
    accountId: 'eip155:1:0xdef1cafe',
    message: 'actionCenter.deposit.complete',
    amountCryptoPrecision: '1.5',
    contractName: 'Aave',
    chainName: 'Ethereum Mainnet',
  },
}

const mockYieldWithdrawAction: GenericTransactionAction = {
  id: 'uuid-2',
  type: ActionType.Withdraw,
  status: ActionStatus.Complete,
  createdAt: 1700000002000,
  updatedAt: 1700000003000,
  transactionMetadata: {
    displayType: GenericTransactionDisplayType.Yield,
    txHash: '0xdef456',
    chainId: 'eip155:1',
    assetId: 'eip155:1/slip44:60',
    accountId: 'eip155:1:0xdef1cafe',
    message: 'actionCenter.withdrawal.complete',
    amountCryptoPrecision: '0.5',
    contractName: 'Lido',
    chainName: 'Ethereum Mainnet',
  },
}

const mockSendAction: GenericTransactionAction = {
  id: 'uuid-3',
  type: ActionType.Send,
  status: ActionStatus.Complete,
  createdAt: 1700000004000,
  updatedAt: 1700000005000,
  transactionMetadata: {
    displayType: GenericTransactionDisplayType.SEND,
    txHash: '0xsend789',
    chainId: 'eip155:1',
    assetId: 'eip155:1/slip44:60',
    accountId: 'eip155:1:0xdef1cafe',
    message: 'sent',
    amountCryptoPrecision: '1.0',
  },
}

const mockActionState: ActionState = {
  byId: {
    'uuid-1': mockYieldDepositAction,
    'uuid-2': mockYieldWithdrawAction,
    'uuid-3': mockSendAction,
  },
  ids: ['uuid-1', 'uuid-2', 'uuid-3'],
}

describe('selectYieldActionsByTxHash', () => {
  it('should return an empty object when no yield actions exist', () => {
    const emptyState = { byId: {}, ids: [] }
    const result = selectYieldActionsByTxHash.resultFunc(emptyState.byId, emptyState.ids)
    expect(result).toEqual({})
  })

  it('should index yield actions by txHash', () => {
    const result = selectYieldActionsByTxHash.resultFunc(mockActionState.byId, mockActionState.ids)

    expect(result['0xabc123']).toBe(mockYieldDepositAction)
    expect(result['0xdef456']).toBe(mockYieldWithdrawAction)
  })

  it('should exclude non-yield actions', () => {
    const result = selectYieldActionsByTxHash.resultFunc(mockActionState.byId, mockActionState.ids)

    expect(result['0xsend789']).toBeUndefined()
    expect(Object.keys(result)).toHaveLength(2)
  })

  it('should handle actions without txHash', () => {
    const actionWithoutHash: GenericTransactionAction = {
      ...mockYieldDepositAction,
      id: 'uuid-no-hash',
      transactionMetadata: {
        ...mockYieldDepositAction.transactionMetadata,
        txHash: '',
      },
    }

    const state: ActionState = {
      byId: { 'uuid-no-hash': actionWithoutHash },
      ids: ['uuid-no-hash'],
    }

    const result = selectYieldActionsByTxHash.resultFunc(state.byId, state.ids)
    expect(result).toEqual({})
  })
})

describe('selectWalletActions', () => {
  const arbitrumWithdrawAction: ArbitrumBridgeWithdrawAction = {
    id: 'arbitrum-bridge-withdraw-0xwithdraw',
    type: ActionType.ArbitrumBridgeWithdraw,
    status: ActionStatus.ClaimAvailable,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    arbitrumBridgeMetadata: {
      withdrawTxHash: '0xwithdraw',
      amountCryptoBaseUnit: '1000',
      assetId: 'eip155:42161/slip44:60',
      destinationAssetId: 'eip155:1/slip44:60',
      accountId: 'eip155:42161:0xarb',
      destinationAccountId: 'eip155:1:0xarb',
    },
  }

  it('shows an arbitrum withdraw only to the wallet that made it', () => {
    expect(
      selectWalletActions.resultFunc([arbitrumWithdrawAction], ['eip155:42161:0xarb'], {}),
    ).toEqual([arbitrumWithdrawAction])
    expect(
      selectWalletActions.resultFunc([arbitrumWithdrawAction], ['eip155:42161:0xother'], {}),
    ).toEqual([])
  })
})

const action = (
  id: string,
  status: ActionStatus,
  createdAt: number,
  updatedAt: number,
): GenericTransactionAction => ({
  ...mockSendAction,
  id,
  status,
  createdAt,
  updatedAt,
})

const claimAction = (
  id: string,
  status: ActionStatus,
  createdAt: number,
  updatedAt: number,
): GenericTransactionAction => ({
  ...action(id, status, createdAt, updatedAt),
  type: ActionType.Claim,
})

const arbitrumWithdraw = (
  id: string,
  status: ActionStatus,
  createdAt: number,
  claimableAt: number,
  claimTxHash?: string,
): ArbitrumBridgeWithdrawAction => ({
  id,
  type: ActionType.ArbitrumBridgeWithdraw,
  status,
  createdAt,
  updatedAt: createdAt,
  arbitrumBridgeMetadata: {
    withdrawTxHash: id,
    amountCryptoBaseUnit: '1000',
    assetId: 'eip155:42161/slip44:60',
    destinationAssetId: 'eip155:1/slip44:60',
    accountId: 'eip155:42161:0xarb',
    destinationAccountId: 'eip155:1:0xarb',
    claimableAt,
    claimTxHash,
  },
})

describe('selectWalletActionsSorted', () => {
  it('lists actions newest first, dating in-flight actions by start and settled ones by last update', () => {
    const oldPending = action('old-pending', ActionStatus.Pending, 100, 900)
    const newPending = action('new-pending', ActionStatus.Pending, 300, 300)
    const recentlyDone = action('recently-done', ActionStatus.Complete, 150, 800)
    const longDone = action('long-done', ActionStatus.Complete, 400, 500)
    const abandoned = action('abandoned', ActionStatus.Abandoned, 999, 999)

    const sorted = selectWalletActionsSorted.resultFunc([
      recentlyDone,
      oldPending,
      abandoned,
      longDone,
      newPending,
    ])

    expect(sorted.map(a => a.id)).toEqual([
      'recently-done',
      'long-done',
      'new-pending',
      'old-pending',
    ])
  })

  it('keeps claims in the full list subscribers read', () => {
    const claimable = claimAction('claimable', ActionStatus.ClaimAvailable, 200, 950)

    expect(selectWalletActionsSorted.resultFunc([claimable]).map(a => a.id)).toEqual(['claimable'])
  })
})

describe('selectWalletRecentActions', () => {
  it('leaves claims to the claims tab, but keeps settled claims', () => {
    const claimable = claimAction('claimable', ActionStatus.ClaimAvailable, 200, 950)
    const pendingWithdraw = arbitrumWithdraw('pending-withdraw', ActionStatus.Initiated, 300, 900)
    const claimed = arbitrumWithdraw('claimed', ActionStatus.Claimed, 100, 100)

    const recent = selectWalletRecentActions.resultFunc([claimed, pendingWithdraw, claimable])

    expect(recent.map(a => a.id)).toEqual(['claimed'])
  })
})

describe('selectWalletClaimActions', () => {
  it('lists claims newest first by the same timestamps as the feed', () => {
    const oldReady = claimAction('old-ready', ActionStatus.ClaimAvailable, 100, 100)
    const newReady = arbitrumWithdraw('new-ready', ActionStatus.ClaimAvailable, 200, 200)
    const claiming = arbitrumWithdraw('claiming', ActionStatus.Pending, 50, 60, '0xclaim')
    const pending = arbitrumWithdraw('pending', ActionStatus.Initiated, 300, 1_000)
    const swap = action('swap', ActionStatus.Pending, 500, 500)

    const claims = selectWalletClaimActions.resultFunc([
      claiming,
      swap,
      oldReady,
      pending,
      newReady,
    ])

    expect(claims.map(a => a.id)).toEqual(['pending', 'new-ready', 'old-ready', 'claiming'])
  })
})
