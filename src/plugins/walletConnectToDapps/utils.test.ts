import { solanaChainId } from '@shapeshiftoss/caip'
import type { SessionTypes } from '@walletconnect/types'
import { BaseError, ExecutionRevertedError, HttpRequestError } from 'viem'
import { describe, expect, it } from 'vitest'

import {
  extractConnectedAccounts,
  getGasEstimateRevert,
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

  it('keeps a dApp gas limit above the buffered estimate', () => {
    expect(getRecommendedGasLimit('100000', '200000')).toBe('200000')
  })

  it('falls back to the dApp gas limit without an estimate', () => {
    expect(getRecommendedGasLimit(undefined, '99358')).toBe('99358')
  })

  it('uses the buffered estimate without a dApp gas limit', () => {
    expect(getRecommendedGasLimit('82798', undefined)).toBe('99358')
  })
})

describe('getGasEstimateRevert', () => {
  const estimateError = (details: string) =>
    new BaseError('Estimate gas failed', {
      cause: new ExecutionRevertedError({ cause: new BaseError('RPC error', { details }) }),
    })

  it('returns the revert reason from a reverted estimate', () => {
    expect(
      getGasEstimateRevert(estimateError('execution reverted: ERC20: insufficient allowance')),
    ).toEqual({ reason: 'ERC20: insufficient allowance' })
  })

  it('flags a revert without a reason', () => {
    expect(getGasEstimateRevert(estimateError('execution reverted'))).toEqual({
      reason: undefined,
    })
  })

  it('ignores estimation outages', () => {
    expect(getGasEstimateRevert(new HttpRequestError({ url: 'https://rpc.example' }))).toBe(
      undefined,
    )
    expect(getGasEstimateRevert(new Error('unchained unavailable'))).toBe(undefined)
    expect(getGasEstimateRevert(null)).toBe(undefined)
  })
})
