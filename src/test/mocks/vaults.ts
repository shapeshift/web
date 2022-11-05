import { KnownChainIds } from '@keepkey/types'
import BigNumber from 'bignumber.js'
import type {
  MergedEarnVault,
  MergedSerializableOpportunity,
} from 'pages/Defi/hooks/useVaultBalances'

export const mockVault = (obj: {
  id: string
  tvl: {
    balance: string
    balanceUsdc: string
    assetId: string
  }
  apy?: number
}): MergedSerializableOpportunity & { fiatAmount: string } => ({
  version: '',
  expired: false,
  isNew: false,
  isApprovalRequired: true,
  displayName: '',
  feeAsset: {
    assetId: '',
  },
  price: new BigNumber(0),
  supply: new BigNumber(0),
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
    displayIcon: '',
    displayName: '',
    defaultDisplayToken: '',
    hideIfNoDeposits: false,
  },
  underlyingAsset: {
    assetId: '',
    balance: new BigNumber(0),
  },
  positionAsset: {
    assetId: '',
    balance: new BigNumber(0),
    underlyingPerPosition: new BigNumber(1),
  },
  name: '',
  symbol: '',
  ...obj,
  tvl: {
    balance: new BigNumber(obj.tvl.balance),
    balanceUsdc: new BigNumber(obj.tvl.balanceUsdc),
    assetId: '',
  },
  provider: '',
  apy: new BigNumber(obj.apy || 0),
  fiatAmount: '0',
})

export const mockVaultWithBalance = (obj: { id: string; fiatAmount: string }): MergedEarnVault => ({
  feeAsset: {
    assetId: '',
  },
  price: new BigNumber(0),
  supply: new BigNumber(0),
  displayName: '',
  isApprovalRequired: true,
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
    displayIcon: '',
    displayName: '',
    defaultDisplayToken: '',
    hideIfNoDeposits: false,
  },
  underlyingAsset: {
    assetId: '',
    balance: new BigNumber(0),
  },
  positionAsset: {
    assetId: '',
    balance: new BigNumber(0),
    underlyingPerPosition: new BigNumber(1),
  },
  provider: '',
  vaultAssetId: '',
  tokenAssetId: '',
  pricePerShare: new BigNumber(0),
  cryptoAmount: '0',
  version: '',
  expired: false,
  isNew: false,
  tvl: {
    assetId: '',
    balance: new BigNumber('0'),
    balanceUsdc: new BigNumber('0'),
  },
  chain: KnownChainIds.EthereumMainnet,
  name: '',
  symbol: '',
  underlyingTokenBalanceUsdc: '0',
  apy: new BigNumber(0),
  ...obj,
})
