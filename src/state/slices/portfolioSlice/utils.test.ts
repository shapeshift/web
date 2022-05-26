import { AssetId, btcChainId, ethChainId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'

import {
  accountIdToChainId,
  accountIdToLabel,
  accountIdToSpecifier,
  assetIdToChainId,
  findAccountsByAssetId,
  makeBalancesByChainBucketsFlattened,
  makeSortedAccountBalances,
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

describe('assetIdToChainId', () => {
  it('returns a ETH chainId for a given ETH assetId', () => {
    const ethAssetId = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'
    const chainId = 'eip155:1'
    const result = assetIdToChainId(ethAssetId)
    expect(result).toEqual(chainId)
  })

  it('returns a BTC chainId for a given BTC assetId', () => {
    const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
    const btcChainId = 'bip122:000000000019d6689c085ae165831e93'
    const result = assetIdToChainId(btcAssetId)
    expect(result).toEqual(btcChainId)
  })
})

describe('findAccountsByAssetId', () => {
  const ethAccountId = 'eip155:1:0xdef1cafe'
  const ethAccount2Id = 'eip155:1:0xryankk'
  const ethAssetId = 'eip155:1/erc20:0xdef1cafe'
  const ethAsset2Id = 'eip155:1/erc20:0xryankk'

  it('returns correct accountId for a given assetId', () => {
    const portfolioAccounts = {
      [ethAccountId]: { assetIds: [ethAssetId] },
      [ethAccount2Id]: { assetIds: [ethAsset2Id] },
    }

    const result = findAccountsByAssetId(portfolioAccounts, ethAssetId)
    expect(result).toEqual([ethAccountId])
  })

  it('returns correct accountIds for a given assetId', () => {
    const portfolioAccounts = {
      [ethAccountId]: { assetIds: [ethAssetId, ethAsset2Id] },
      [ethAccount2Id]: { assetIds: [ethAsset2Id] },
    }

    const result = findAccountsByAssetId(portfolioAccounts, ethAsset2Id)
    expect(result).toEqual([ethAccountId, ethAccount2Id])
  })

  it('returns accountIds for a given chain if assetId is not found in any current accounts', () => {
    const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
    const btcAccountId = 'bip122:000000000019d6689c085ae165831e93:zpubfoobarbaz'

    const portfolioAccounts = {
      [ethAccountId]: { assetIds: [ethAsset2Id] },
      [ethAccount2Id]: { assetIds: [] },
      [btcAccountId]: { assetIds: [] },
    }

    const result = findAccountsByAssetId(portfolioAccounts, ethAssetId)
    expect(result).toEqual([ethAccountId, ethAccount2Id])

    const result2 = findAccountsByAssetId(portfolioAccounts, btcAssetId)
    expect(result2).toEqual([btcAccountId])
  })
})

describe('makeSortedAccountBalances', () => {
  it('makes sorted account balances - mixed assets', () => {
    const accountBalances = {
      'bip122:000000000019d6689c085ae165831e93:someXpub': '8',
      'bip122:000000000019d6689c085ae165831e93:someZpub': '7',
      'eip155:1:someEthAccount': '0.00',
      'bip122:someYpub': '3',
      'cosmos:cosmoshub-4:someCosmosAccount': '10',
    }

    const result = makeSortedAccountBalances(accountBalances)
    expect(result).toEqual([
      'cosmos:cosmoshub-4:someCosmosAccount',
      'bip122:000000000019d6689c085ae165831e93:someXpub',
      'bip122:000000000019d6689c085ae165831e93:someZpub',
      'bip122:someYpub',
      'eip155:1:someEthAccount',
    ])
  })
})

describe('makeBalancesByChainBucketsFlattened', () => {
  const assets = {
    'cosmos:cosmoshub-4/slip44:118': {
      chain: 'cosmos',
    },
    'bip122:000000000019d6689c085ae165831e93/slip44:0': {
      chain: 'bitcoin',
    },
    'bip122:000000000933ea01ad0ee984209779ba/slip44:0': {
      chain: 'bitcoin',
    },
    'eip155:1/slip44:60': {
      chain: 'ethereum',
    },
  } as unknown as { [k: AssetId]: Asset }

  it('makes flattened balances by chain buckets - mixed assets', () => {
    const accountBalances = [
      'bip122:000000000019d6689c085ae165831e93:someXpub',
      'eip155:1:someEthAccount',
      'cosmos:cosmoshub-4:someCosmosAccount',
      'bip122:000000000019d6689c085ae165831e93:someZpub',
      'bip122:000000000019d6689c085ae165831e93:someYpub',
    ]

    const result = makeBalancesByChainBucketsFlattened(accountBalances, assets)
    expect(result).toEqual([
      'bip122:000000000019d6689c085ae165831e93:someXpub',
      'bip122:000000000019d6689c085ae165831e93:someZpub',
      'bip122:000000000019d6689c085ae165831e93:someYpub',
      'eip155:1:someEthAccount',
      'cosmos:cosmoshub-4:someCosmosAccount',
    ])
  })
  it('makes flattened balances by chain buckets - Bitcoin assets only', () => {
    const accountBalances = [
      'bip122:000000000019d6689c085ae165831e93:someXpub',
      'bip122:000000000019d6689c085ae165831e93:someZpub',
      'bip122:000000000019d6689c085ae165831e93:someYpub',
    ]

    const result = makeBalancesByChainBucketsFlattened(accountBalances, assets)
    expect(result).toEqual([
      'bip122:000000000019d6689c085ae165831e93:someXpub',
      'bip122:000000000019d6689c085ae165831e93:someZpub',
      'bip122:000000000019d6689c085ae165831e93:someYpub',
    ])
  })
})
