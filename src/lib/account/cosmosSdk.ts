import { CHAIN_REFERENCE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsCosmos, supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveCosmosSdkAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  const result = await (async () => {
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      const { chainReference } = fromChainId(chainId)
      const adapter = assertGetCosmosSdkChainAdapter(chainId)
      if (chainReference === CHAIN_REFERENCE.CosmosHubMainnet) {
        if (!supportsCosmos(wallet)) continue
      }
      if (chainReference === CHAIN_REFERENCE.ThorchainMainnet) {
        if (!supportsThorchain(wallet)) continue
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
