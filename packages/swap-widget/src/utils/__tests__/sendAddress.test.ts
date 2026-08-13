import { describe, expect, it } from 'vitest'

import { resolveSendAddress } from '../sendAddress'

const btcChainId = 'bip122:000000000019d6689c085ae165831e93'

describe('resolveSendAddress', () => {
  it('prefers the connected wallet, which is where funds actually come from', () => {
    expect(
      resolveSendAddress({
        customAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        sellChainId: btcChainId,
      }),
    ).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
  })

  it('falls back to a valid user-entered address', () => {
    expect(
      resolveSendAddress({
        customAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        walletAddress: undefined,
        sellChainId: btcChainId,
      }),
    ).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')
  })

  it('ignores an address from the wrong chain', () => {
    expect(
      resolveSendAddress({
        customAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        walletAddress: undefined,
        sellChainId: btcChainId,
      }),
    ).toBeUndefined()
  })

  it('is undefined with nothing supplied', () => {
    expect(
      resolveSendAddress({ customAddress: '', walletAddress: undefined, sellChainId: btcChainId }),
    ).toBeUndefined()
  })
})
