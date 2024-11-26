import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, btcChainId, ethAssetId, ethChainId, foxAssetId } from '@shapeshiftoss/caip'
import type { type Account, evm } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import merge from 'lodash/merge'
import toLower from 'lodash/toLower'

export const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const yvusdcAssetId: AssetId = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'
export const zeroAssetId: AssetId = 'eip155:1/erc20:0xf0939011a9bb95c3b791f0cb546377ed2693a574'
export const unknown1AssetId: AssetId = 'eip155:1/erc20:0x85c2ea30a20e5e96e1de337fe4cd8829be86f844'
export const unknown2AssetId: AssetId = 'eip155:1/erc20:0x9cda935e34bcdfd1add4d2e8161d0f28fc354795'
export const unknown3AssetId: AssetId = 'eip155:1/erc20:0xecd18dbba2987608c094ed552fef3924edb91e'

export const assetIds = [
  ethAssetId,
  foxAssetId,
  usdcAssetId,
  yvusdcAssetId,
  zeroAssetId,
  btcAssetId,
]

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

export const mockEthToken = (obj?: Partial<evm.Token>): evm.Token => ({
  balance: '100',
  assetId: foxAssetId,
  name: 'Fox',
  precision: 18,
  symbol: 'FOX',
  ...obj,
})

export const mockEthAccount = (obj?: Partial<Account<KnownChainIds.EthereumMainnet>>) =>
  merge(
    {},
    {
      balance: '1000',
      chainId: ethChainId,
      assetId: ethAssetId,
      chain: KnownChainIds.EthereumMainnet,
      chainSpecific: {
        nonce: 1,
      },
      pubkey: ethPubKeys[0],
    },
    obj,
  )

export const mockBtcAddress = (obj?: { balance?: string; pubkey?: string }) => ({
  balance: '100',
  pubkey: btcAddresses[0],
  ...obj,
})

export const mockBtcAccount = (
  obj?: Partial<Account<KnownChainIds.BitcoinMainnet>>,
): Account<KnownChainIds.BitcoinMainnet> =>
  merge(
    {},
    {
      balance: '100',
      chainId: btcChainId,
      assetId: btcAssetId,
      chain: KnownChainIds.BitcoinMainnet,
      chainSpecific: {
        addresses: [],
        nextChangeAddressIndex: 3,
        nextReceiveAddressIndex: 3,
      },
      pubkey: btcPubKeys[0],
    },
    obj,
  )

export const mockEthAndBtcAccounts = ({
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
          mockEthToken({ balance: '3000000000000000000', assetId: foxAssetId }),
          mockEthToken({ balance: '10000000', assetId: usdcAssetId }),
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
        tokens: [mockEthToken({ balance: '2000000000000000000', assetId: foxAssetId })],
      },
    }),
    ethAccount2Obj,
  )

  const btcAccount = merge(
    mockBtcAccount({
      balance: '20000',
      chainSpecific: {
        addresses: [mockBtcAddress({ balance: '3' })],
      },
    }),
    btcAccountObj,
  )

  const btcAccount2 = merge(
    mockBtcAccount({
      balance: '400000',
      pubkey: btcPubKeys[1],
      chainSpecific: {
        addresses: [mockBtcAddress({ balance: '3', pubkey: btcAddresses[1] })],
      },
    }),
    btcAccount2Obj,
  )

  const btcAccount3 = merge(
    mockBtcAccount({
      balance: '500000',
      pubkey: btcPubKeys[2],
      chainSpecific: {
        addresses: [mockBtcAddress({ balance: '500000', pubkey: btcAddresses[2] })],
      },
    }),
    btcAccount2Obj,
  )

  const ethAccountId = `${ethAccount.chainId}:${toLower(ethAccount.pubkey)}`
  const ethAccount2Id = `${ethAccount2.chainId}:${toLower(ethAccount2.pubkey)}`
  const btcAccountId = `${btcAccount.chainId}:${btcAccount.pubkey}`
  const btcAccount2Id = `${btcAccount2.chainId}:${btcAccount2.pubkey}`
  const btcAccount3Id = `${btcAccount3.chainId}:${btcAccount3.pubkey}`

  return {
    ethAccount,
    ethAccount2,
    btcAccount,
    btcAccount2,
    ethAccountId,
    ethAccount2Id,
    btcAccountId,
    btcAccount2Id,
    btcAccount3,
    btcAccount3Id,
  }
}
