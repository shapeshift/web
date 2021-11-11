import { ChainTypes } from '@shapeshiftoss/types'
import {
  EarnProvider,
  EarnType
} from 'features/earn/contexts/EarnManagerProvider/EarnManagerProvider'

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
    vaultAddress: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
    name: 'DAI',
    symbol: 'yvDAI',
    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
    name: 'USDC',
    symbol: 'yvUSDC',
    tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0x27b7b1ad7288079A66d12350c828D3C00A6F07d7',
    name: 'Curve-IronBank',
    symbol: 'yvCurve-IronBank',
    tokenAddress: '0x5282a4ef67d9c33135340fb3289cc1711c13638c',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0xA696a63cc78DfFa1a63E9E50587C197387FF6C7E',
    name: 'WBTC',
    symbol: 'yvWBTC',
    tokenAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0x2DfB14E32e2F8156ec15a2c21c3A6c053af52Be8',
    name: 'Curve-MIM',
    symbol: 'yvCurve-MIM',
    tokenAddress: '0x5a6a4d54456819380173272a5e8e9b9904bdf41b',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
    name: 'LINK',
    symbol: 'yvLINK',
    tokenAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0x25212Df29073FfFA7A67399AcEfC2dd75a831A1A',
    name: 'Curve-EURS',
    symbol: 'yvCurve-EURS',
    tokenAddress: '0x194ebd173f6cdace046c53eacce9b953f28411d1',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0xE537B5cc158EB71037D4125BDD7538421981E6AA',
    name: 'Curve-3Crypto',
    symbol: 'yvCurve-3Crypto',
    tokenAddress: '0xc4ad29ba4b3c580e6d59105fff484999997675ff',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0x4B5BfD52124784745c1071dcB244C6688d2533d3',
    name: 'USD',
    symbol: 'yUSD',
    tokenAddress: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  },
  {
    vaultAddress: '0xdb25cA703181E7484a155DD612b06f57E12Be5F0',
    name: 'YFI',
    symbol: 'yvYFI',
    tokenAddress: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
    chain: ChainTypes.Ethereum,
    provider: EarnProvider.Yearn,
    type: EarnType.Vault
  }
]
