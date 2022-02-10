import {
  accountIdToChainId,
  accountIdToLabel,
  accountIdToSpecifier,
  assetIdtoChainId,
  btcChainId,
  ethChainId,
  findAccountsByAssetId
} from './utils'

describe('accountIdToChainId', () => {
  it('can get eth caip2 from accountId', () => {
    const accountId = 'eip155:1:0xdef1cafe'
    const chainId = accountIdToChainId(accountId)
    expect(chainId).toEqual(ethChainId)
  })

  it('can get btc caip2 from accountId', () => {
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

  it('can get xpub form accountId', () => {
    const xpub = 'xpubfoobarbaz'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const result = accountIdToSpecifier(accountId)
    expect(result).toEqual(xpub)
  })
})

describe('accountIdToLabel', () => {
  it('can get eth address from accountId', () => {
    const address = '0xdef1...cafe'
    const accountId = 'eip155:1:0xdef1cafe'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(address)
  })

  it('returns "Legacy" for xpubs', () => {
    const label = 'LEGACY'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(label)
  })

  it('returns "Segwit" for ypubs', () => {
    const label = 'SEGWIT'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:ypubfoobarbaz'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(label)
  })

  it('returns "Segwit Native" for zpubs', () => {
    const label = 'SEGWIT NATIVE'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:zpubfoobarbaz'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(label)
  })
})

describe('assetIdtoChainId', () => {
  it('returns a ETH chainId for a given ETH assetId', () => {
    const ethAssetId = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'
    const chainId = 'eip155:1'
    const result = assetIdtoChainId(ethAssetId)
    expect(result).toEqual(chainId)
  })

  it('returns a BTC chainId for a given BTC assetId', () => {
    const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
    const btcChainId = 'bip122:000000000019d6689c085ae165831e93'
    const result = assetIdtoChainId(btcAssetId)
    expect(result).toEqual(btcChainId)
  })
})

describe('findAccountsByAssetId', () => {
  const ethAccountId = 'eip155:1:0xdef1cafe'
  const ethAccount2Id = 'eip155:1:0xryankk'
  const ethAssetId = 'eip155:1/erc20:0xdef1cafe'
  const ethAsset2Id = 'eip155:1/erc20:0xryankk'

  it('returns correct accountId for a given assetId', () => {
    const portolioAccounts = {
      [ethAccountId]: [ethAssetId],
      [ethAccount2Id]: [ethAsset2Id]
    }

    const result = findAccountsByAssetId(portolioAccounts, ethAssetId)
    expect(result).toEqual([ethAccountId])
  })

  it('returns correct accountIds for a given assetId', () => {
    const portolioAccounts = {
      [ethAccountId]: [ethAssetId, ethAsset2Id],
      [ethAccount2Id]: [ethAsset2Id]
    }

    const result = findAccountsByAssetId(portolioAccounts, ethAsset2Id)
    expect(result).toEqual([ethAccountId, ethAccount2Id])
  })

  it('returns accountIds for a given chain if assetId is not found in any current accounts', () => {
    const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
    const btcAccountId = 'bip122:000000000019d6689c085ae165831e93:zpubfoobarbaz'

    const portolioAccounts = {
      [ethAccountId]: [ethAsset2Id],
      [ethAccount2Id]: [],
      [btcAccountId]: []
    }

    const result = findAccountsByAssetId(portolioAccounts, ethAssetId)
    expect(result).toEqual([ethAccountId, ethAccount2Id])

    const result2 = findAccountsByAssetId(portolioAccounts, btcAssetId)
    expect(result2).toEqual([btcAccountId])
  })
})
