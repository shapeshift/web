import { ChainTypes } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { YearnVaultWithApyAndTvl } from 'hooks/useVaultWithoutBalance/useVaultWithoutBalance'
import { MergedEarnVault } from 'pages/Defi/hooks/useVaultBalances'

export const mockVault = (obj?: {
  vaultAddress?: string
  underlyingTokenBalanceUsdc?: string
  apy?: number
}): YearnVaultWithApyAndTvl => ({
  vaultAddress: '',
  version: '',
  expired: false,
  isNew: false,
  tvl: {
    assetId: '',
    balance: new BigNumber('0'),
    balanceUsdc: new BigNumber('0'),
  },
  tokenAddress: '',
  apy: 0,
  chain: ChainTypes.Ethereum,
  name: '',
  symbol: '',
  provider: DefiProvider.Yearn,
  type: DefiType.Vault,
  underlyingTokenBalanceUsdc: '0',
  ...obj,
})

export const mockVaultWithBalance = (obj?: {
  vaultAddress?: string
  fiatAmount?: string
}): MergedEarnVault => ({
  vaultAssetId: '',
  tokenAssetId: '',
  pricePerShare: new BigNumber(0),
  cryptoAmount: '0',
  fiatAmount: '',
  vaultAddress: '',
  version: '',
  expired: false,
  isNew: false,
  tvl: {
    assetId: '',
    balance: new BigNumber('0'),
    balanceUsdc: new BigNumber('0'),
  },
  tokenAddress: '',
  apy: 0,
  chain: ChainTypes.Ethereum,
  name: '',
  symbol: '',
  provider: DefiProvider.Yearn,
  type: DefiType.Vault,
  underlyingTokenBalanceUsdc: '0',
  ...obj,
})
