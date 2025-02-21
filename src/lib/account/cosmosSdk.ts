import { CHAIN_REFERENCE, fromChainId, toAccountId } from '@shapeshiftmonorepo/caip'
import type { AccountMetadataById } from '@shapeshiftmonorepo/types'
import { supportsCosmos, supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'

import type { DeriveAccountIdsAndMetadata } from './account'

import { canAddMetaMaskAccount } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'

export const deriveCosmosSdkAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args
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
      if (
        wallet instanceof MetaMaskMultiChainHDWallet &&
        !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
      ) {
        continue
      }

      const bip44Params = adapter.getBip44Params({ accountNumber })
      const pubkey = await adapter.getAddress({ accountNumber, wallet })
      if (!pubkey) continue
      const accountId = toAccountId({ chainId, account: pubkey })
      acc[accountId] = { bip44Params }
    }
    return acc
  })()
  return result
}
