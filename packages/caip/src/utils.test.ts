import {
  accountIdToChainId,
  accountIdToSpecifier,
  assetIdToChainId,
  btcAssetId,
  btcChainId,
  ethChainId,
  getChainReferenceFromChainId
} from './utils'

describe('accountIdToChainId', () => {
  it('can get eth chainId from accountId', () => {
    const accountId = 'eip155:1:0xdef1cafe'
    const chainId = accountIdToChainId(accountId)
    expect(chainId).toEqual(ethChainId)
  })

  it('can get btc chainId from accountId', () => {
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const chainId = accountIdToChainId(accountId)
    expect(chainId).toEqual(btcChainId)
  })
})

describe('accountIdToSpecifier', () => {
  it('can get eth address from accountId', () => {
    const address = '0xdef1cafe'
    const accountId = 'eip155:1:0xdef1cafe'
    const result = accountIdToSpecifier(accountId)
    expect(result).toEqual(address)
  })

  it('can get xpub from accountId', () => {
    const xpub = 'xpubfoobarbaz'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const result = accountIdToSpecifier(accountId)
    expect(result).toEqual(xpub)
  })
})

describe('assetIdToChainId', () => {
  it('returns a ETH chainId for a given ETH assetId', () => {
    const ethAssetId = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'
    const chainId = 'eip155:1'
    const result = assetIdToChainId(ethAssetId)
    expect(result).toEqual(chainId)
  })

  it('returns a BTC chainId for a given BTC assetId', () => {
    const result = assetIdToChainId(btcAssetId)
    expect(result).toEqual(btcChainId)
  })
})

describe('getChainReferenceFromChainId', () => {
  it('returns the reference from a chainId string with a valid reference', () => {
    const validChainId = 'cosmos:cosmoshub-4'
    const validChainIdReference = 'cosmoshub-4'

    const reference = getChainReferenceFromChainId(validChainId)
    expect(reference).toEqual(validChainIdReference)
  })
  it('returns undefined from an empty chainId string', () => {
    const invalidChainId = ''

    expect(() => getChainReferenceFromChainId(invalidChainId)).toThrow()
  })

  it('returns undefined from an invalid chainId string', () => {
    const invalidChainId = 'foobar'

    expect(() => getChainReferenceFromChainId(invalidChainId)).toThrow()
  })
})
