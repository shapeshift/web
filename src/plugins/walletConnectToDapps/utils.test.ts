import { solanaChainId } from '@shapeshiftoss/caip'
import type { SessionTypes } from '@walletconnect/types'
import { describe, expect, it } from 'vitest'

import { extractConnectedAccounts, getRecommendedGasLimit } from './utils'

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
    expect(getRecommendedGasLimit(82798, undefined)).toBe('99358')
  })
})
