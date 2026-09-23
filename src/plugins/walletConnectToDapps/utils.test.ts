import { solanaChainId } from '@shapeshiftoss/caip'
import type { SessionTypes } from '@walletconnect/types'
import { describe, expect, it } from 'vitest'

import { extractConnectedAccounts } from './utils'

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
