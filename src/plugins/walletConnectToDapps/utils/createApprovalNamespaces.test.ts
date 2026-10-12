import { describe, expect, it } from 'vitest'

import { createApprovalNamespaces } from './createApprovalNamespaces'

describe('createApprovalNamespaces', () => {
  it('lists the approved chains in account order', () => {
    const address = '0x6bf198c2b5c8e48af4e876bc2173175b89b1da0c'
    const baseAccountId = `eip155:8453:${address}`
    const ethAccountId = `eip155:1:${address}`

    const optionalNamespaces = {
      eip155: {
        chains: ['eip155:8453'],
        methods: ['personal_sign'],
        events: ['chainChanged', 'accountsChanged'],
      },
    }

    const namespaces = createApprovalNamespaces(
      {},
      optionalNamespaces,
      [baseAccountId, ethAccountId],
      ['eip155:8453', 'eip155:1'],
    )

    expect(namespaces.eip155.accounts).toEqual([baseAccountId, ethAccountId])
    expect(namespaces.eip155.chains).toEqual(['eip155:8453', 'eip155:1'])
  })
})
