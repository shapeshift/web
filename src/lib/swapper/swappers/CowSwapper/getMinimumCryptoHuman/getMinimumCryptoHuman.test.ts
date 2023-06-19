import { KnownChainIds } from '@shapeshiftoss/types'

import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '0.25'),
}))

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman(KnownChainIds.EthereumMainnet)
    expect(minimumCryptoHuman).toBe('80')
  })

  it('returns minimum for gnosis network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman(KnownChainIds.GnosisMainnet)
    expect(minimumCryptoHuman).toBe('0.04')
  })
})
