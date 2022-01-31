import {
  assetIds,
  btcAddresses,
  btcCaip2,
  btcCaip19,
  ethCaip10s,
  ethCaip19,
  ethPubKeys,
  foxCaip19,
  mockBtcAccount,
  mockBtcAddress,
  mockEthAccount,
  mockEthToken,
  unknown1Caip19,
  unknown2Caip19,
  unknown3Caip19,
  usdcCaip19,
  yvusdcCaip19,
  zeroCaip19
} from 'test/mocks/accounts'
import { bn } from 'lib/bignumber/bignumber'

import { Portfolio } from './portfolioSlice'
import {
  accountIdToChainId,
  accountIdToLabel,
  accountIdToSpecifier,
  accountToPortfolio,
  assetIdtoChainId,
  btcChainId,
  ethChainId,
  findAccountsByAssetId
} from './utils'

const tokenBalance = (ethAccount: any, caip19: any) => {
  return ethAccount.chainSpecific.tokens.find((token: any) => token.caip19 === caip19).balance
}

const ethAccount1 = mockEthAccount({
  balance: '27803816548287370',
  chainSpecific: {
    nonce: 5,
    tokens: [
      mockEthToken({ balance: '42729243327349401946', caip19: foxCaip19 }),
      mockEthToken({ balance: '41208456', caip19: usdcCaip19 }),
      mockEthToken({ balance: '8178352', caip19: yvusdcCaip19 })
    ]
  },
  pubkey: ethPubKeys[0]
})

const ethAccount2 = mockEthAccount({
  balance: '23803816548287370',
  chainSpecific: {
    nonce: 5,
    tokens: [
      mockEthToken({ balance: '40729243327349401946', caip19: foxCaip19 }),
      mockEthToken({ balance: '41208456', caip19: usdcCaip19 }),
      mockEthToken({ balance: '8178352', caip19: yvusdcCaip19 })
    ]
  },
  pubkey: ethPubKeys[1]
})

const ethAccount3 = mockEthAccount({
  balance: '23803816548287371',
  chainSpecific: {
    nonce: 5,
    tokens: [
      mockEthToken({ balance: '4516123', caip19: unknown1Caip19 }),
      mockEthToken({ balance: '8178312', caip19: yvusdcCaip19 }),
      mockEthToken({ balance: '4516124', caip19: unknown2Caip19 }),
      mockEthToken({ balance: '41208442', caip19: usdcCaip19 }),
      mockEthToken({ balance: '4516125', caip19: unknown3Caip19 }),
      mockEthToken({ balance: '40729243327349401958', caip19: foxCaip19 }),
      mockEthToken({ balance: '4516126', caip19: zeroCaip19 })
    ]
  },
  pubkey: ethPubKeys[2]
})

const btcAccount = mockBtcAccount({
  balance: '1010',
  chainSpecific: {
    addresses: [
      mockBtcAddress({ balance: '1000', pubkey: btcAddresses[0] }),
      mockBtcAddress({ balance: '0', pubkey: btcAddresses[1] }),
      mockBtcAddress({ balance: '10', pubkey: btcAddresses[2] }),
      mockBtcAddress({ balance: '0', pubkey: btcAddresses[3] })
    ]
  }
})

const ethAccountSpecifier1 = ethCaip10s[0].toLowerCase()
const ethAccountSpecifier2 = ethCaip10s[1].toLowerCase()
const ethAccountSpecifier3 = ethCaip10s[2].toLowerCase()
const btcAccountSpecifier = `${btcCaip2}:${btcAccount.pubkey}`

const expectedPortfolio1: Portfolio = {
  accounts: {
    byId: {
      [ethAccountSpecifier1]: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19],
      [ethAccountSpecifier2]: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19],
      [btcAccountSpecifier]: [btcCaip19]
    },
    ids: [ethAccountSpecifier1, ethAccountSpecifier2, btcAccountSpecifier]
  },
  assetBalances: {
    byId: {
      [ethCaip19]: bn(ethAccount1.balance).plus(ethAccount2.balance).toString(),
      [foxCaip19]: bn(tokenBalance(ethAccount1, foxCaip19))
        .plus(tokenBalance(ethAccount2, foxCaip19))
        .toString(),
      [usdcCaip19]: bn(tokenBalance(ethAccount1, usdcCaip19))
        .plus(tokenBalance(ethAccount2, usdcCaip19))
        .toString(),
      [yvusdcCaip19]: bn(tokenBalance(ethAccount1, yvusdcCaip19))
        .plus(tokenBalance(ethAccount2, yvusdcCaip19))
        .toString(),
      [btcCaip19]: '1010'
    },
    ids: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19, btcCaip19]
  },
  accountBalances: {
    byId: {
      [ethAccountSpecifier1]: {
        [ethCaip19]: '27803816548287370',
        [foxCaip19]: '42729243327349401946',
        [usdcCaip19]: '41208456',
        [yvusdcCaip19]: '8178352'
      },
      [ethAccountSpecifier2]: {
        [ethCaip19]: '23803816548287370',
        [foxCaip19]: '40729243327349401946',
        [usdcCaip19]: '41208456',
        [yvusdcCaip19]: '8178352'
      },
      [btcAccountSpecifier]: {
        [btcCaip19]: '1010'
      }
    },
    ids: [ethAccountSpecifier1, ethAccountSpecifier2, btcAccountSpecifier]
  },
  accountSpecifiers: {
    byId: {
      [ethAccountSpecifier1]: [ethAccountSpecifier1],
      [ethAccountSpecifier2]: [ethAccountSpecifier2],
      [btcAccountSpecifier]: btcAccount.chainSpecific.addresses.map(
        address => `${btcCaip2}:${address['pubkey']}`
      )
    },
    ids: [ethAccountSpecifier1, ethAccountSpecifier2, btcAccountSpecifier]
  }
}

const expectedPortfolio2: Portfolio = {
  accounts: {
    byId: {
      [ethAccountSpecifier3]: [ethCaip19, yvusdcCaip19, usdcCaip19, foxCaip19, zeroCaip19],
      [btcAccountSpecifier]: [btcCaip19]
    },
    ids: [ethAccountSpecifier3, btcAccountSpecifier]
  },
  assetBalances: {
    byId: {
      [ethCaip19]: ethAccount3.balance.toString(),
      [foxCaip19]: tokenBalance(ethAccount3, foxCaip19).toString(),
      [usdcCaip19]: tokenBalance(ethAccount3, usdcCaip19).toString(),
      [yvusdcCaip19]: tokenBalance(ethAccount3, yvusdcCaip19).toString(),
      [zeroCaip19]: tokenBalance(ethAccount3, zeroCaip19).toString(),
      [btcCaip19]: '1010'
    },
    ids: [ethCaip19, yvusdcCaip19, usdcCaip19, foxCaip19, zeroCaip19, btcCaip19]
  },
  accountBalances: {
    byId: {
      [ethAccountSpecifier3]: {
        [ethCaip19]: '23803816548287371',
        [foxCaip19]: '40729243327349401958',
        [usdcCaip19]: '41208442',
        [yvusdcCaip19]: '8178312',
        [zeroCaip19]: '4516126'
      },
      [btcAccountSpecifier]: {
        [btcCaip19]: '1010'
      }
    },
    ids: [ethAccountSpecifier3, btcAccountSpecifier]
  },
  accountSpecifiers: {
    byId: {
      [ethAccountSpecifier3]: [ethAccountSpecifier3],
      [btcAccountSpecifier]: btcAccount.chainSpecific.addresses.map(
        address => `${btcCaip2}:${address['pubkey']}`
      )
    },
    ids: [ethAccountSpecifier3, btcAccountSpecifier]
  }
}

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

describe('accountToPortfolio', () => {
  it('can normalize eth and btc accounts to portfolio', () => {
    const portfolioAccounts = {
      [ethAccount1.pubkey]: ethAccount1,
      [ethAccount2.pubkey]: ethAccount2,
      [btcAccount.pubkey]: btcAccount
    }

    const result = accountToPortfolio({ portfolioAccounts, assetIds })
    expect(result).toEqual(expectedPortfolio1)
  })

  it('can create portfolio and exclude unknown asset ids', () => {
    const portfolioAccounts = {
      [ethAccount3.pubkey]: ethAccount3,
      [btcAccount.pubkey]: btcAccount
    }

    const result = accountToPortfolio({ portfolioAccounts, assetIds })
    expect(result).toEqual(expectedPortfolio2)
  })
})
