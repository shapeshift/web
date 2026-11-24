import { solanaChainId } from '@shapeshiftoss/caip'
import type { SessionTypes } from '@walletconnect/types'
import { BaseError, ExecutionRevertedError, HttpRequestError, InsufficientFundsError } from 'viem'
import { describe, expect, it } from 'vitest'

import {
  extractConnectedAccounts,
  getGasEstimateFailure,
  getRecommendedGasLimit,
  isMethodPermittedForAccount,
} from './utils'

const SOLANA_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'
const ETH_ACCOUNT_ID = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535'
const LEGACY_SOLANA_ACCOUNT_ID = `solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ:${SOLANA_ADDRESS}`
const UNSUPPORTED_ACCOUNT_ID = 'eip155:999999:0xabc'

const session: Pick<SessionTypes.Struct, 'namespaces'> = {
  namespaces: {
    solana: {
      accounts: [LEGACY_SOLANA_ACCOUNT_ID],
      chains: ['solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ'],
      methods: [],
      events: [],
    },
    eip155: {
      accounts: [ETH_ACCOUNT_ID, UNSUPPORTED_ACCOUNT_ID],
      chains: ['eip155:1', 'eip155:999999'],
      methods: [],
      events: [],
    },
  },
}

describe('extractConnectedAccounts', () => {
  it('keeps supported accounts and rewrites a superseded Solana mainnet id', () => {
    expect(extractConnectedAccounts(session)).toEqual([
      `${solanaChainId}:${SOLANA_ADDRESS}`,
      ETH_ACCOUNT_ID,
    ])
  })
})

describe('isMethodPermittedForAccount', () => {
  const checksummedSession: Pick<SessionTypes.Struct, 'namespaces'> = {
    namespaces: {
      eip155: {
        accounts: ['eip155:8453:0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'],
        chains: ['eip155:8453'],
        methods: ['personal_sign'],
        events: [],
      },
    },
  }
  const accountId = 'eip155:8453:0xa44c286ba83bb771cd0107b2c1df678435bd1535'

  it('matches a checksummed session account to its lowercased account id', () => {
    expect(isMethodPermittedForAccount(checksummedSession, 'personal_sign', accountId)).toBe(true)
  })

  it('rejects a method the session does not permit', () => {
    expect(isMethodPermittedForAccount(checksummedSession, 'eth_sendTransaction', accountId)).toBe(
      false,
    )
  })

  it('rejects an account outside the session', () => {
    expect(
      isMethodPermittedForAccount(
        checksummedSession,
        'personal_sign',
        'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535',
      ),
    ).toBe(false)
  })
})

describe('getRecommendedGasLimit', () => {
  it('raises an under-estimated dApp gas limit to the buffered estimate', () => {
    expect(getRecommendedGasLimit('123716', '99358')).toBe('148460')
  })

  it('keeps a dApp gas limit that covers the estimate', () => {
    expect(getRecommendedGasLimit('95000', '100000')).toBe('100000')
    expect(getRecommendedGasLimit('100000', '100000')).toBe('100000')
  })

  it('falls back to the dApp gas limit without an estimate', () => {
    expect(getRecommendedGasLimit(undefined, '99358')).toBe('99358')
  })

  it('ignores a zero dApp gas limit', () => {
    expect(getRecommendedGasLimit(undefined, '0')).toBe(undefined)
    expect(getRecommendedGasLimit('82798', '0')).toBe('99358')
  })

  it('uses the buffered estimate without a dApp gas limit', () => {
    expect(getRecommendedGasLimit('82798', undefined)).toBe('99358')
  })
})

describe('getGasEstimateFailure', () => {
  const estimateError = (cause: BaseError) => new BaseError('Estimate gas failed', { cause })
  const reverted = (details: string) =>
    estimateError(new ExecutionRevertedError({ cause: new BaseError('RPC error', { details }) }))

  it('returns the contract revert reason', () => {
    expect(
      getGasEstimateFailure(reverted('execution reverted: ERC20: insufficient allowance')),
    ).toEqual({ type: 'revert', reason: 'ERC20: insufficient allowance' })
  })

  it('omits the reason when the node gives none', () => {
    expect(getGasEstimateFailure(reverted('execution reverted'))).toEqual({
      type: 'revert',
      reason: undefined,
    })
    expect(getGasEstimateFailure(reverted('gas required exceeds allowance (0)'))).toEqual({
      type: 'revert',
      reason: undefined,
    })
    expect(getGasEstimateFailure(reverted('execution reverted: 0x08c379a0000000'))).toEqual({
      type: 'revert',
      reason: undefined,
    })
  })

  it('flags insufficient funds', () => {
    expect(getGasEstimateFailure(estimateError(new InsufficientFundsError()))).toEqual({
      type: 'insufficientFunds',
    })
    expect(
      getGasEstimateFailure(
        estimateError(new BaseError('RPC error', { details: 'EVM error: OutOfFunds' })),
      ),
    ).toEqual({ type: 'insufficientFunds' })
  })

  it('ignores estimation outages', () => {
    expect(getGasEstimateFailure(new HttpRequestError({ url: 'https://rpc.example' }))).toBe(
      undefined,
    )
    expect(getGasEstimateFailure(new Error('unchained unavailable'))).toBe(undefined)
    expect(getGasEstimateFailure(null)).toBe(undefined)
  })
})
