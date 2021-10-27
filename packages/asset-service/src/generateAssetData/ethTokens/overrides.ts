import { ContractTypes, TokenAsset } from '@shapeshiftoss/types'

export const tokensToOverride: Array<TokenAsset> = [
  // example overriding FOX token with custom values instead of goingecko
  {
    caip19: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    name: 'Fox',
    precision: 18,
    tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'FOX'
  }
]
