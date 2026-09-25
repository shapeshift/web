import { describe, expect, it } from 'vitest'

import {
  selectWalletActions,
  selectWalletActionsSorted,
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

describe('selectWalletActionsSorted', () => {
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

  it('anchors in-flight actions on top by start time, then settled ones by last update', () => {
    const oldPending = action('old-pending', ActionStatus.Pending, 100, 900)
    const newPending = action('new-pending', ActionStatus.Initiated, 300, 300)
    const claimable = action('claimable', ActionStatus.ClaimAvailable, 200, 950)
    const recentlyDone = action('recently-done', ActionStatus.Complete, 150, 800)
    const longDone = action('long-done', ActionStatus.Claimed, 400, 500)
    const abandoned = action('abandoned', ActionStatus.Abandoned, 999, 999)

    const sorted = selectWalletActionsSorted.resultFunc([
      recentlyDone,
      oldPending,
      abandoned,
      longDone,
      claimable,
      newPending,
    ])

    expect(sorted.map(a => a.id)).toEqual([
      'new-pending',
      'claimable',
      'old-pending',
      'recently-done',
      'long-done',
    ])
  })
})
