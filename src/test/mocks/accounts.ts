import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { merge } from 'lodash'
import toLower from 'lodash/toLower'

export const ethCaip2 = 'eip155:1'
export const ethCaip19 = 'eip155:1/slip44:60'
export const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const usdcCaip19 = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const yvusdcCaip19 = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'
export const zeroCaip19 = 'eip155:1/erc20:0xf0939011a9bb95c3b791f0cb546377ed2693a574'
export const unknown1Caip19 = 'eip155:1/erc20:0x85c2ea30a20e5e96e1de337fe4cd8829be86f844'
export const unknown2Caip19 = 'eip155:1/erc20:0x9cda935e34bcdfd1add4d2e8161d0f28fc354795'
export const unknown3Caip19 = 'eip155:1/erc20:0xecd18dbba2987608c094ed552fef3924edb91e'

export const btcCaip2 = 'bip122:000000000019d6689c085ae165831e93'
export const btcCaip19 = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

export const cosmosCaip2 = 'cosmos:cosmoshub-4'
export const cosmosCaip19 = 'cosmos:cosmoshub-4/slip44:118'

export const assetIds = [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19, zeroCaip19]

export const btcCaip10s = Object.freeze([
  'bip122:000000000019d6689c085ae165831e93:bc1qp45tn99yv90gnkqlx9q8uryr9ekxmrzm472kn7',
  'bip122:000000000019d6689c085ae165831e93:bc1qx0aaya6e0e8rfukvma9adhncjd77yhas70qukt',
  'bip122:000000000019d6689c085ae165831e93:bc1qtjxklypn7zhp05ja29c5z8ycscmq0vhhzslm99',
])

export const ethCaip10s = Object.freeze([
  'eip155:1:0x9a2d593725045d1727d525dd07a396f9ff079bb1',
  'eip155:1:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
  'eip155:1:0x6c8a778ef52e121b7dff1154c553662306a970e9',
])

export const ethPubKeys = Object.freeze([
  '0x9a2d593725045d1727d525dd07a396f9ff079bb1',
  '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
  '0x6c8a778ef52e121b7dff1154c553662306a970e9',
])

export const btcPubKeys = Object.freeze([
  'zpub6qk8s2NQsYG6X2Mm6iU2ii3yTAqDb2XqnMu9vo2WjvqwjSvjjiYQQveYXbPxrnRT5Yb5p0x934be745172066EDF795ffc5EA9F28f19b440c637BaBw1wowPwbS8fj7uCfj3UhqhD2LLbvY6Ni1w',
  'xpub6qk8s2NQsYG6X2Mm6iU2ii3yTAqDb2XqnMu9vo2WjvqwjSvjjiYQQveYXbPxrnRT5Yb5p0x934be745172066EDF795ffc5EA9F28f19b440c637BaBw1wowPwbS8fj7uCfj3UhqhD2LLbvY6Ni1w',
  'ypub6qk8s2NQsYG6X2Mm6iU2ii3yTAqDb2XqnMu9vo2WjvqwjSvjjiYQQveYXbPxrnRT5Yb5p0x934be745172066EDF795ffc5EA9F28f19b440c637BaBw1wowPwbS8fj7uCfj3UhqhD2LLbvY6Ni1w',
])

export const btcAddresses = Object.freeze([
  'bc1qp45tn99yv90gnkqlx9q8uryr9ekxmrzm472kn7',
  'bc1qr9y9lxpynxm8nkswez555xnv2plwwluxrpa55l',
  'bc1q3fmp9tdacg5edlgmh8ttxz7cvj598dcn7w9xxd',
  'bc1qvzuvxskhr5eyaf65w37jxwwvskwyw3rlnqtyzc',
  'bc1q4cqvc3ul562uuz358y77hmqhlfex8jhvfzzek8',
])

export const cosmosPubKeys = Object.freeze(['cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669'])

export const mockEthToken = (obj?: { balance?: string; caip19?: string }) => ({
  balance: '100',
  caip19: foxCaip19,
  ...obj,
})

export const mockEthAccount = (obj?: Partial<chainAdapters.Account<ChainTypes.Ethereum>>) =>
  merge(
    {},
    {
      balance: '1000',
      caip2: ethCaip2,
      caip19: ethCaip19,
      chain: ChainTypes.Ethereum,
      chainSpecific: {
        nonce: 1,
      },
      pubkey: ethPubKeys[0],
    },
    obj,
  )

export const mockCosmosAccount = (obj?: Partial<chainAdapters.Account<ChainTypes.Cosmos>>) =>
  merge(
    {},
    {
      balance: '1000',
      caip2: cosmosCaip2,
      caip19: cosmosCaip19,
      chain: ChainTypes.Cosmos,
      chainSpecific: {
        sequence: '',
        accountNumber: '',
        delegations: [],
        redelegations: [],
        undelegations: [],
        rewards: [],
      },
      pubkey: cosmosPubKeys[0],
    },
    obj,
  )

export const mockBtcAddress = (obj?: { balance?: string; pubkey?: string }) => ({
  balance: '100',
  pubkey: btcAddresses[0],
  ...obj,
})

export const mockBtcAccount = (obj?: Partial<chainAdapters.Account<ChainTypes.Bitcoin>>) =>
  merge(
    {},
    {
      balance: '100',
      caip2: btcCaip2,
      caip19: btcCaip19,
      chain: ChainTypes.Bitcoin,
      chainSpecific: {
        addresses: [],
        nextChangeAddressIndex: 3,
        nextReceiveAddressIndex: 3,
      },
      pubkey: btcPubKeys[0],
    },
    obj,
  )

export const mockETHandBTCAccounts = ({
  ethAccountObj,
  ethAccount2Obj,
  btcAccountObj,
  btcAccount2Obj,
}: {
  ethAccountObj?: Record<string, any>
  ethAccount2Obj?: Record<string, any>
  btcAccountObj?: Record<string, any>
  btcAccount2Obj?: Record<string, any>
} = {}) => {
  const ethAccount = merge(
    mockEthAccount({
      chainSpecific: {
        nonce: 1,
        tokens: [
          mockEthToken({ balance: '3000000000000000000', caip19: foxCaip19 }),
          mockEthToken({ balance: '10000000', caip19: usdcCaip19 }),
        ],
      },
    }),
    ethAccountObj,
  )

  const ethAccount2 = merge(
    mockEthAccount({
      balance: '10',
      pubkey: ethPubKeys[1],
      chainSpecific: {
        nonce: 1,
        tokens: [mockEthToken({ balance: '2000000000000000000', caip19: foxCaip19 })],
      },
    }),
    ethAccount2Obj,
  )

  const btcAccount = merge(
    mockBtcAccount({
      balance: '10',
      chainSpecific: {
        addresses: [mockBtcAddress({ balance: '3' })],
      },
    }),
    btcAccountObj,
  )

  const btcAccount2 = merge(
    mockBtcAccount({
      balance: '10',
      pubkey: btcPubKeys[1],
      chainSpecific: {
        addresses: [mockBtcAddress({ balance: '3', pubkey: btcAddresses[1] })],
      },
    }),
    btcAccount2Obj,
  )

  const ethAccountId = `${ethAccount.caip2}:${toLower(ethAccount.pubkey)}`
  const ethAccount2Id = `${ethAccount2.caip2}:${toLower(ethAccount2.pubkey)}`
  const btcAccountId = `${btcAccount.caip2}:${btcAccount.pubkey}`
  const btcAccount2Id = `${btcAccount2.caip2}:${btcAccount2.pubkey}`

  return {
    ethAccount,
    ethAccount2,
    btcAccount,
    btcAccount2,
    ethAccountId,
    ethAccount2Id,
    btcAccountId,
    btcAccount2Id,
  }
}
