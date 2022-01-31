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

  return vaults.map((vault: Vault) => {
    return {
      vaultAddress: toLower(vault.address),
      name: vault.name,
      symbol: vault.symbol,
      tokenAddress: toLower(vault.token),
      chain: ChainTypes.Ethereum,
      provider: DefiProvider.Yearn,
      type: DefiType.Vault
    }
  })
}
