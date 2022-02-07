import { ChainTypes } from '@shapeshiftoss/types'
import { Vault } from '@yfi/sdk'
import { toLower } from 'lodash'

import { bnOrZero, DefiProvider, DefiType, SupportedYearnVault } from '..'

export const transformVault = (vault: Vault): SupportedYearnVault => {
  return {
    ...vault,
    vaultAddress: toLower(vault.address),
    name: `${vault.name} ${vault.version}`,
    symbol: vault.symbol,
    tokenAddress: toLower(vault.token),
    chain: ChainTypes.Ethereum,
    provider: DefiProvider.Yearn,
    type: DefiType.Vault,
    expired: vault.metadata.depositsDisabled || bnOrZero(vault.metadata.depositLimit).lte(0)
  }
}
