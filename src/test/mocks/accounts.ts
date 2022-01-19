import { ChainTypes } from '@shapeshiftoss/types'
import { merge } from 'lodash'

export const ethCaip2 = 'eip155:1'
export const ethCaip19 = 'eip155:1/slip44:60'
export const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const usdcCaip19 = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const yvusdcCaip19 = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'

export const btcCaip2 = 'bip122:000000000019d6689c085ae165831e93'
export const btcCaip19 = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

export const btcCaip10s = Object.freeze([
  'bip122:000000000019d6689c085ae165831e93:bc1qp45tn99yv90gnkqlx9q8uryr9ekxmrzm472kn7',
  'bip122:000000000019d6689c085ae165831e93:bc1qx0aaya6e0e8rfukvma9adhncjd77yhas70qukt',
  'bip122:000000000019d6689c085ae165831e93:bc1qtjxklypn7zhp05ja29c5z8ycscmq0vhhzslm99'
])

export const ethCaip10s = Object.freeze([
  'eip155:1:0x9a2d593725045d1727d525dd07a396f9ff079bb1',
  'eip155:1:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'
])

export const ethPubKeys = Object.freeze([
  '0x9a2d593725045d1727d525dd07a396f9ff079bb1',
  '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'
])

export const mockEthToken = (obj?: { balance?: string; caip19?: string }) => ({
  balance: '100',
  caip19: foxCaip19,
  ...obj
})

export const mockEthAccount = (obj?: Record<string, any>) =>
  merge(
    {},
    {
      balance: '1000',
      caip2: ethCaip2,
      caip19: ethCaip19,
      chain: ChainTypes.Ethereum,
      chainSpecific: {
        nonce: 1
      },
      pubkey: ethPubKeys[0]
    },
    obj
  )
