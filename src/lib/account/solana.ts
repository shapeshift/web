import { fromAccountId, solanaChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { store } from '@/state/store'

export const deriveSolanaAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsSolana(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== solanaChainId) continue

    const adapter = assertGetSolanaChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await (async () => {
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

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
