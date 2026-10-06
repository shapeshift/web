import { describe, expect, it } from 'vitest'

import { getSessionAuthIss } from './SessionAuthRequestHandlerUtil'

describe('getSessionAuthIss', () => {
  it('checksums the address of a lowercase account id', () => {
    expect(getSessionAuthIss('eip155:8453:0xa44c286ba83bb771cd0107b2c1df678435bd1535')).toBe(
      'did:pkh:eip155:8453:0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
    )
  })
})
