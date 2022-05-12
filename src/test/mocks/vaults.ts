import { ChainTypes } from '@shapeshiftoss/types'
import { YearnVaultWithApyAndTvl } from 'hooks/useVaultWithoutBalance/useVaultWithoutBalance'
import { bn } from 'lib/bignumber/bignumber'
import { MergedEarnVault } from 'pages/Defi/hooks/useVaultBalances'

export const mockVault = (obj?: {
  vaultAddress?: string
  underlyingTokenBalanceUsdc?: string
  apy?: number
}): YearnVaultWithApyAndTvl => ({
  vaultAddress: '',
  address: '',
  typeId: 'VAULT_V2',
  token: '',
  version: '',
  decimals: '',
  tokenId: '',
  expired: false,
  underlyingTokenBalance: {
    amount: '0',
    amountUsdc: '0',
  },
  metadata: {
    symbol: '',
    pricePerShare: '',
    migrationAvailable: false,
    latestVaultAddress: '',
    depositLimit: '',
    emergencyShutdown: false,
    controller: '',
    totalAssets: '',
    totalSupply: '',
    displayName: '',
    displayIcon: '',
    defaultDisplayToken: '',
    hideIfNoDeposits: false,
  },
  underlyingTokenBalanceUsdc: '',
  apy: 0,
  chain: ChainTypes.Ethereum,
  name: '',
  symbol: '',
  tokenAddress: '',
  provider: '',
  type: '',
  ...obj,
})

export const mockVaultWithBalance = (obj?: {
  vaultAddress?: string
  fiatAmount?: string
}): MergedEarnVault => ({
  fiatAmount: '',
  vaultAddress: '',
  underlyingTokenBalanceUsdc: '',
  apy: 0,
  chain: ChainTypes.Ethereum,
  cryptoAmount: '',
  address: '',
  typeId: 'VAULT_V2',
  token: '',
  version: '',
  decimals: '',
  tokenId: '',
  expired: false,
  underlyingTokenBalance: {
    amount: '0',
    amountUsdc: '0',
  },
  metadata: {
    symbol: '',
    pricePerShare: '',
    migrationAvailable: false,
    latestVaultAddress: '',
    depositLimit: '',
    emergencyShutdown: false,
    controller: '',
    totalAssets: '',
    totalSupply: '',
    displayName: '',
    displayIcon: '',
    defaultDisplayToken: '',
    hideIfNoDeposits: false,
  },
  name: '',
  symbol: '',
  tokenAddress: '',
  provider: '',
  type: '',
  vaultCaip19: '',
  tokenCaip19: '',
  pricePerShare: bn(0),
  ...obj,
})
