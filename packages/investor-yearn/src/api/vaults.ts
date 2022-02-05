import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { Vault } from '@yfi/sdk'
import toLower from 'lodash/toLower'

import { DefiProvider, DefiType } from '../constants/enums'
import { yearnSdk } from './yearn-sdk'

export type SupportedYearnVault = {
  vaultAddress: string
  name: string
  symbol: string
  tokenAddress: string
  chain: ChainTypes
  provider: string
  type: string
  expired: boolean
}

export const getSupportedVaults = async (): Promise<SupportedYearnVault[]> => {
  const vaults = await yearnSdk.vaults.get()
  return vaults.map((vault: Vault) => {
    return {
      vaultAddress: toLower(vault.address),
      name: `${vault.name} ${vault.version}`,
      symbol: vault.symbol,
      tokenAddress: toLower(vault.token),
      chain: ChainTypes.Ethereum,
      provider: DefiProvider.Yearn,
      type: DefiType.Vault,
      expired: vault.metadata.depositsDisabled || bnOrZero(vault.metadata.depositLimit).lte(0)
    }
  })
}
