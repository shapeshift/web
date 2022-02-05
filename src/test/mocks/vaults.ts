import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { MergedEarnVault } from 'pages/Defi/hooks/useVaultBalances'

import { YearnVaultWithApyAndTvl } from '../../hooks/useVaultWithoutBalance/useVaultWithoutBalance'

export const mockVault = (obj?: {
  vaultAddress?: string
  underlyingTokenBalanceUsdc?: string
  apy?: number
}): YearnVaultWithApyAndTvl => ({
  vaultAddress: '',
  underlyingTokenBalanceUsdc: '',
  apy: 0,
  chain: ChainTypes.Ethereum,
  name: '',
  symbol: '',
  tokenAddress: '',
  provider: '',
  type: '',
  ...obj
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
  name: '',
  symbol: '',
  tokenAddress: '',
  provider: '',
  type: '',
  vaultCaip19: '',
  tokenCaip19: '',
  pricePerShare: bnOrZero(0),
  ...obj
})
