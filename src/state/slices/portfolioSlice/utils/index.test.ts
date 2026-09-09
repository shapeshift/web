import {
  arbitrumAssetId,
  avalancheAssetId,
  baseAssetId,
  bscAssetId,
  btcAssetId,
  btcChainId,
  ethAssetId,
  monadAssetId,
  monadChainId,
  optimismAssetId,
  polygonAssetId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import { accountIdToLabel, accountToPortfolio, findAccountsByAssetId } from '.'

import { trimWithEndEllipsis } from '@/lib/utils'
import { accountIdToFeeAssetId } from '@/lib/utils/accounts'
import { mockChainAdapters } from '@/test/mocks/portfolio'

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('accountIdToFeeAssetId', () => {
  it('can get eth feeAssetId from accountId', () => {
    const accountId = 'eip155:1:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(ethAssetId)
  })
  it('can get avalanche feeAssetId from accountId', () => {
    const accountId = 'eip155:43114:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(avalancheAssetId)
  })
  it('can get optimism feeAssetId from accountId', () => {
    const accountId = 'eip155:10:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(optimismAssetId)
  })
  it('can get bnbsmartchain feeAssetId from accountId', () => {
    const accountId = 'eip155:56:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(bscAssetId)
  })
  it('can get polygon feeAssetId from accountId', () => {
    const accountId = 'eip155:137:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(polygonAssetId)
  })
  it('can get arbitrum feeAssetId from accountId', () => {
    const accountId = 'eip155:42161:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(arbitrumAssetId)
  })
  it('can get base feeAssetId from accountId', () => {
    const accountId = 'eip155:8453:0xdef1cafe'
    const result = accountIdToFeeAssetId(accountId)
    expect(result).toEqual(baseAssetId)
  })
})

describe('accountIdToLabel', () => {
  it('can get eth address from accountId', () => {
    const address = '0xdef1...f1cafe'
    const accountId = 'eip155:1:0xdef1abc1234567890abcdef1234567890f1cafe'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(address)
  })

  it('returns "Legacy" for xpubs', () => {
    const label = 'Legacy'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(label)
  })

  it('returns "Segwit" for ypubs', () => {
    const label = 'Segwit'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:ypubfoobarbaz'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(label)
  })

  it('returns "Segwit Native" for zpubs', () => {
    const label = 'Segwit Native'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:zpubfoobarbaz'
    const result = accountIdToLabel(accountId)
    expect(result).toEqual(label)
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

describe('trimWithEndEllipsis', () => {
  it('should trim the description according to the max number of characters', () => {
    const LongFoxDescription =
      'FOX is an ERC-20 token created by ShapeShift which serves as the governance token for the ShapeShift DAO, token holders can vote on proposals relating to the operation and treasury of the DAO. The token supports'
    const ExpectedTrimmedFoxDescription =
      'FOX is an ERC-20 token created by ShapeShift which serves as the governance token for the ShapeShift DAO, token holders can vote on proposals relating to the operation and treasury of the DAO...'

    expect(trimWithEndEllipsis(undefined)).toEqual('')
    expect(trimWithEndEllipsis('')).toEqual('')
    expect(trimWithEndEllipsis('abcdef')).toEqual('abcdef')
    expect(trimWithEndEllipsis(LongFoxDescription)).toEqual(LongFoxDescription)

    expect(trimWithEndEllipsis(undefined, 191)).toEqual('')
    expect(trimWithEndEllipsis('', 191)).toEqual('')
    expect(trimWithEndEllipsis('abcdef', 191)).toEqual('abcdef')
    expect(trimWithEndEllipsis(LongFoxDescription, 191)).toEqual(ExpectedTrimmedFoxDescription)
  })

  it('should not add ellipsis when content length equals max length', () => {
    const exactly50Chars = 'BlackRock USD Institutional Digital Liquidity Fund'
    expect(exactly50Chars.length).toEqual(50)
    expect(trimWithEndEllipsis(exactly50Chars, 50)).toEqual(exactly50Chars)
  })
})

describe('accountToPortfolio', () => {
  const evmPubkey = '0x1111111111111111111111111111111111111111'
  const btcPubkey = 'xpub6CBTest'

  const makeMonadAccount = (isDegraded: boolean): Account<KnownChainIds.MonadMainnet> => ({
    balance: '42',
    pubkey: evmPubkey,
    chainId: monadChainId,
    assetId: monadAssetId,
    chain: KnownChainIds.MonadMainnet,
    isDegraded,
    chainSpecific: { nonce: 1, tokens: [] },
  })

  const makeBtcAccount = (isDegraded: boolean): Account<KnownChainIds.BitcoinMainnet> => ({
    balance: '42',
    pubkey: btcPubkey,
    chainId: btcChainId,
    assetId: btcAssetId,
    chain: KnownChainIds.BitcoinMainnet,
    isDegraded,
    chainSpecific: { addresses: [] },
  })

  const btcAccountId = `${btcChainId}:${btcPubkey}`
  const monadAccountId = toAccountId({ chainId: monadChainId, account: evmPubkey })

  it('propagates a degraded account', () => {
    const portfolio = accountToPortfolio({
      portfolioAccounts: {
        [evmPubkey]: makeMonadAccount(true),
        [btcPubkey]: makeBtcAccount(true),
      },
      assetIds: [],
    })

    expect(portfolio.accounts.byId[monadAccountId].isDegraded).toBe(true)
    expect(portfolio.accounts.byId[btcAccountId].isDegraded).toBe(true)
  })

  // upsertPortfolio deep merges, so a healthy account has to write false explicitly - leaving the
  // key off lets an earlier degraded state survive and the banner never clears
  it('writes false for a healthy account so a stale degraded flag is cleared', () => {
    const portfolio = accountToPortfolio({
      portfolioAccounts: {
        [evmPubkey]: makeMonadAccount(false),
        [btcPubkey]: makeBtcAccount(false),
      },
      assetIds: [],
    })

    expect(portfolio.accounts.byId[monadAccountId].isDegraded).toBe(false)
    expect(portfolio.accounts.byId[btcAccountId].isDegraded).toBe(false)
  })
})
