import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { Vault } from '@yfi/sdk'
import {
  DefiProvider,
  DefiType
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import toLower from 'lodash/toLower'

import { yearnSdk } from './yearn-sdk'

export type SupportedYearnVault = {
  vaultAddress: string
  name: string
  symbol: string
  tokenAddress: string
  chain: ChainTypes
  provider: string
  type: string
}

export const getSupportedVaults = async (): Promise<SupportedYearnVault[]> => {
  const vaults = await yearnSdk.vaults.get()

  return vaults
    .filter((vault: Vault) => {
      // Currently filtering out all vaults where deposits are disabled or the deposit limit is 0.
      // TODO: Update modal so that vaults with disabled deposit only show if a user has a balance
      // and only display the option to withdraw from the vault.
      return !vault.metadata.depositsDisabled && bnOrZero(vault.metadata.depositLimit).gt(0)
    })
    .map((vault: Vault) => {
      return {
        vaultAddress: toLower(vault.address),
        name: `${vault.name} ${vault.version}`,
        symbol: vault.symbol,
        tokenAddress: toLower(vault.token),
        chain: ChainTypes.Ethereum,
        provider: DefiProvider.Yearn,
        type: DefiType.Vault
      }
    })
}
