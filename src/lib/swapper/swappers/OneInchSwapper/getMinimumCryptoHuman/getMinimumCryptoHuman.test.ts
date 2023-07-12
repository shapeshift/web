import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman('0.0165498')
    expect(minimumCryptoHuman).toEqual('60.42369092073620225018')
  })
})
