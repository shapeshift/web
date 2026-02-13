import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import {
  getTransfers,
  getTxType,
  isSupportedMethod,
  Method,
  yieldActionToMethod,
} from '@/hooks/useTxDetails/useTxDetails'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { mockAssetState } from '@/test/mocks/assets'
import { createMockEthTxs, EthReceive, EthSend, TradeTx } from '@/test/mocks/txs'

const [deposit] = createMockEthTxs('foo')

const baseTransactionMetadata: GenericTransactionAction['transactionMetadata'] = {
  displayType: GenericTransactionDisplayType.Yield,
  txHash: '0xtest',
  chainId: 'eip155:1',
  assetId: 'eip155:1/slip44:60',
  accountId: 'eip155:1:0xtest',
  message: 'test',
  amountCryptoPrecision: '1.0',
}

const makeYieldAction = (
  type: GenericTransactionAction['type'],
  metadataOverrides?: Partial<GenericTransactionAction['transactionMetadata']>,
): GenericTransactionAction => ({
  id: 'test-action',
  type,
  status: ActionStatus.Complete,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  transactionMetadata: {
    ...baseTransactionMetadata,
    ...metadataOverrides,
  },
})

describe('useTxDetails', () => {
  it('should get correct type for standard send', () => {
    const transfers = getTransfers(EthSend, mockAssetState().byId)
    const type = getTxType(EthSend, transfers)
    expect(type).toEqual(TransferType.Send)
  })

  it('should get correct type for a standard receive', () => {
    const transfers = getTransfers(EthReceive, mockAssetState().byId)
    const type = getTxType(EthReceive, transfers)
    expect(type).toEqual(TransferType.Receive)
  })

  it('should get correct type for a trade', () => {
    const transfers = getTransfers(TradeTx, mockAssetState().byId)
    const type = getTxType(TradeTx, transfers)
    expect(type).toEqual(TradeType.Trade)
  })

  it('should get correct type for a supported method', () => {
    const transfers = getTransfers(deposit, mockAssetState().byId)
    const type = getTxType(deposit, transfers)
    expect(type).toEqual('method')
  })

  it('should get correct type for a common tx', () => {
    const common = deposit
    if (!common.data) throw new Error('Unhandled rejection in tests')
    common.data.method = 'common'
    const transfers = getTransfers(common, mockAssetState().byId)
    const type = getTxType(common, transfers)
    expect(type).toEqual('common')
  })
})

describe('yield tx enrichment', () => {
  const makeTxWithMethod = (method: string): Tx => ({
    ...EthSend,
    txid: '0xyield123',
    data: { parser: 'erc20', method, assetId: 'eip155:1/slip44:60' },
  })

  describe('isSupportedMethod', () => {
    it.each([
      Method.Deposit,
      Method.Withdraw,
      Method.Approve,
      Method.Stake,
      Method.Unstake,
      Method.UnstakeRequest,
      Method.YieldClaim,
      Method.Reward,
    ])('should return true for enriched yield tx with %s method', method => {
      expect(isSupportedMethod(makeTxWithMethod(method))).toBe(true)
    })

    it('should return false for tx without data', () => {
      expect(isSupportedMethod(EthSend)).toBe(false)
    })
  })

  describe('getTxType', () => {
    it('should return method type for enriched yield deposit tx', () => {
      const enrichedTx = makeTxWithMethod('deposit')
      const transfers = getTransfers(enrichedTx, mockAssetState().byId)
      expect(getTxType(enrichedTx, transfers)).toEqual('method')
    })

    it('should return method type for enriched yield withdraw tx', () => {
      const enrichedTx = makeTxWithMethod('withdraw')
      const transfers = getTransfers(enrichedTx, mockAssetState().byId)
      expect(getTxType(enrichedTx, transfers)).toEqual('method')
    })

    it('should return method type for enriched yield approve tx', () => {
      const enrichedTx = makeTxWithMethod('approve')
      const transfers = getTransfers(enrichedTx, mockAssetState().byId)
      expect(getTxType(enrichedTx, transfers)).toEqual('method')
    })

    it('should not affect non-yield txs', () => {
      const transfers = getTransfers(EthSend, mockAssetState().byId)
      expect(getTxType(EthSend, transfers)).toEqual(TransferType.Send)
    })
  })
})

describe('yieldActionToMethod', () => {
  describe('deposit actions', () => {
    it('should return Stake for staking yield deposits', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'staking' })),
      ).toBe(Method.Stake)
    })

    it('should return Stake for native-staking yield deposits', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'native-staking' })),
      ).toBe(Method.Stake)
    })

    it('should return Stake for liquid-staking yield deposits', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'liquid-staking' })),
      ).toBe(Method.Stake)
    })

    it('should return Stake for pooled-staking yield deposits', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'pooled-staking' })),
      ).toBe(Method.Stake)
    })

    it('should return Stake for restaking yield deposits', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'restaking' })),
      ).toBe(Method.Stake)
    })

    it('should return Deposit for vault yield deposits', () => {
      expect(yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'vault' }))).toBe(
        Method.Deposit,
      )
    })

    it('should return Deposit for lending yield deposits', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Deposit, { yieldType: 'lending' })),
      ).toBe(Method.Deposit)
    })

    it('should return Deposit when yieldType is not set (backward compat)', () => {
      expect(yieldActionToMethod(makeYieldAction(ActionType.Deposit))).toBe(Method.Deposit)
    })
  })

  describe('withdraw actions', () => {
    it('should return UnstakeRequest for staking with cooldown', () => {
      expect(
        yieldActionToMethod(
          makeYieldAction(ActionType.Withdraw, {
            yieldType: 'liquid-staking',
            cooldownPeriodSeconds: 86400,
          }),
        ),
      ).toBe(Method.UnstakeRequest)
    })

    it('should return Unstake for staking without cooldown', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Withdraw, { yieldType: 'staking' })),
      ).toBe(Method.Unstake)
    })

    it('should return Unstake for staking with zero cooldown', () => {
      expect(
        yieldActionToMethod(
          makeYieldAction(ActionType.Withdraw, {
            yieldType: 'native-staking',
            cooldownPeriodSeconds: 0,
          }),
        ),
      ).toBe(Method.Unstake)
    })

    it('should return Withdraw for vault withdrawals', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Withdraw, { yieldType: 'vault' })),
      ).toBe(Method.Withdraw)
    })

    it('should return Withdraw for lending withdrawals', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Withdraw, { yieldType: 'lending' })),
      ).toBe(Method.Withdraw)
    })

    it('should return Withdraw for vault even with cooldown', () => {
      expect(
        yieldActionToMethod(
          makeYieldAction(ActionType.Withdraw, {
            yieldType: 'vault',
            cooldownPeriodSeconds: 86400,
          }),
        ),
      ).toBe(Method.Withdraw)
    })

    it('should return Withdraw when yieldType is not set (backward compat)', () => {
      expect(yieldActionToMethod(makeYieldAction(ActionType.Withdraw))).toBe(Method.Withdraw)
    })
  })

  describe('approve actions', () => {
    it('should return Approve regardless of yield type', () => {
      expect(
        yieldActionToMethod(makeYieldAction(ActionType.Approve, { yieldType: 'staking' })),
      ).toBe(Method.Approve)
    })
  })

  describe('claim actions', () => {
    it('should return YieldClaim regardless of yield type', () => {
      expect(yieldActionToMethod(makeYieldAction(ActionType.Claim, { yieldType: 'vault' }))).toBe(
        Method.YieldClaim,
      )
    })
  })

  describe('default fallback', () => {
    it('should return Deposit for unhandled action types', () => {
      expect(yieldActionToMethod(makeYieldAction(ActionType.Send))).toBe(Method.Deposit)
    })
  })
})
