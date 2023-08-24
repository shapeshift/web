import { ASSET_REFERENCE, CHAIN_REFERENCE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { cosmosSdkChainIds } from '@shapeshiftoss/chain-adapters'
import { supportsCosmos, supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import { getConfig } from 'config'
import { cosmosGetAddress } from 'utils/snaps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { AccountMetadataById } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveCosmosSdkAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  const result = await (async () => {
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      if (!cosmosSdkChainIds.includes(chainId as CosmosSdkChainId))
        throw new Error(`${chainId} does not exist in ${cosmosSdkChainIds}`)
      const { chainReference } = fromChainId(chainId)

      const isSnapsEnabled = getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
      const adapter = getChainAdapterManager().get(chainId)!
      if (chainReference === CHAIN_REFERENCE.CosmosHubMainnet) {
        if (!isSnapsEnabled && !supportsCosmos(wallet)) continue
      }
      if (chainReference === CHAIN_REFERENCE.ThorchainMainnet) {
        if (!supportsThorchain(wallet)) continue
      }

      if (isSnapsEnabled) {
        const bip44Params = {
          // TODO: We shouldn't do this manually
          accountNumber,
          coinType: Number(ASSET_REFERENCE.Cosmos),
          purpose: 44,
        }
        const pubkey = await cosmosGetAddress(bip44Params)
        if (!pubkey) continue
        const accountId = toAccountId({ chainId, account: pubkey })
        acc[accountId] = {
          bip44Params,
        }
        return acc
      }

      const bip44Params = adapter.getBIP44Params({ accountNumber })
      const pubkey = await adapter.getAddress({ accountNumber, wallet })
      if (!pubkey) continue
      const accountId = toAccountId({ chainId, account: pubkey })
      acc[accountId] = { bip44Params }
    }
    return acc
  })()
  return result
}
