import { fromAccountId, solanaChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/selectors'
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
      // Check if account already exists in store
      const state = store.getState()
      const accountIdsByNumberAndChain = selectAccountIdsByAccountNumberAndChainId(state)
      const existingAccountIds = accountIdsByNumberAndChain[accountNumber]?.[chainId] ?? []

      if (existingAccountIds.length > 0) {
        // Found it - extract address from accountId
        return fromAccountId(existingAccountIds[0]).account
      }

      // Not in store - fetch from device
      return adapter.getAddress({ accountNumber, wallet })
    })()

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
