import { ChainTypes } from '@shapeshiftoss/types'
import {
  EarnProvider,
  EarnType
} from 'features/earn/contexts/EarnManagerProvider/EarnManagerProvider'
import toLower from 'lodash/toLower'

export type SupportedYearnVault = {
  vaultAddress: string
  name: string
  symbol: string
  tokenAddress: string
  chain: ChainTypes
  provider: string
  type: string
}

export const SUPPORTED_VAULTS: SupportedYearnVault[] = [
  {
    vaultAddress: toLower('0xa258C4606Ca8206D8aA700cE2143D7db854D168c'),
    name: 'WETH',
    symbol: 'yvWETH',
    tokenAddress: toLower('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0xdA816459F1AB5631232FE5e97a05BBBb94970c95'),
    name: 'DAI',
    symbol: 'yvDAI',
    tokenAddress: toLower('0x6b175474e89094c44da98b954eedeac495271d0f'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'),
    name: 'USDC',
    symbol: 'yvUSDC',
    tokenAddress: toLower('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0xA696a63cc78DfFa1a63E9E50587C197387FF6C7E'),
    name: 'WBTC',
    symbol: 'yvWBTC',
    tokenAddress: toLower('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2'),
    name: 'LINK',
    symbol: 'yvLINK',
    tokenAddress: toLower('0x514910771af9ca656af840dff83e8264ecf986ca'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0x4B5BfD52124784745c1071dcB244C6688d2533d3'),
    name: 'USD',
    symbol: 'yUSD',
    tokenAddress: toLower('0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0xdb25cA703181E7484a155DD612b06f57E12Be5F0'),
    name: 'YFI',
    symbol: 'yvYFI',
    tokenAddress: toLower('0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0xd9788f3931Ede4D5018184E198699dC6d66C1915'),
    name: 'AAVE',
    symbol: 'yvAAVE',
    tokenAddress: toLower('0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0xb8c3b7a2a618c552c23b1e4701109a9e756bab67'),
    name: '1INCH',
    symbol: 'yv1INCH',
    tokenAddress: toLower('0x111111111117dc0aa78b770fa6a738034120c302'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0xFBEB78a723b8087fD2ea7Ef1afEc93d35E8Bed42'),
    name: 'UNI',
    symbol: 'yvUNI',
    tokenAddress: toLower('0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: toLower('0x4A3FE75762017DB0eD73a71C9A06db7768DB5e66'),
    name: 'COMP',
    symbol: 'yvCOMP',
    tokenAddress: toLower('0xc00e94cb662c3520282e6f5717214004a7f26888'),
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  }
]
