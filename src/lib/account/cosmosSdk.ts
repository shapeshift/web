import { CHAIN_REFERENCE, fromAccountId, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsCosmos, supportsMayachain, supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { canAddMetaMaskAccount } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { store } from '@/state/store'

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
      if (chainReference === CHAIN_REFERENCE.MayachainMainnet) {
        if (!supportsMayachain(wallet)) continue
      }
      if (
        wallet instanceof MetaMaskMultiChainHDWallet &&
        !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
      ) {
        continue
      }

      const bip44Params = adapter.getBip44Params({ accountNumber })

      const pubkey = await (async () => {
        // Check ALL cached metadata (including inactive accounts) to avoid re-deriving from device
        const state = store.getState()
        const allAccountMetadata = state.portfolio.accountMetadata.byId

        // Search through all cached metadata for matching account
        for (const [accountId, metadata] of Object.entries(allAccountMetadata)) {
          const { chainId: metadataChainId, account } = fromAccountId(accountId)
          const metadataAccountNumber = metadata.bip44Params.accountNumber

          if (metadataChainId === chainId && metadataAccountNumber === accountNumber) {
            // Found cached address - use it instead of re-deriving from device
            return account
          }
        }

        // Not in cache - fetch from device
        return adapter.getAddress({ accountNumber, wallet })
      })()

      if (!pubkey) continue
      const accountId = toAccountId({ chainId, account: pubkey })
      acc[accountId] = { bip44Params }
    }
    return acc
  })()
  return result
}
