import { KnownChainIds } from '@shapeshiftoss/types'

import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman(KnownChainIds.EthereumMainnet, '0.25')
    expect(minimumCryptoHuman).toBe('80')
  })

  it('returns minimum for gnosis network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman(KnownChainIds.GnosisMainnet, '0.25')
    expect(minimumCryptoHuman).toBe('0.04')
  })
})
