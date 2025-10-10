import { fromAccountId, solanaChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { store } from '@/state/store'

const getCachedOrDeriveAddress = async (
  chainId: string,
  accountNumber: number,
  wallet: any,
  adapter: any,
): Promise<string | undefined> => {
  const state = store.getState()
  const allAccountMetadata = state.portfolio.accountMetadata.byId

  // Check cache for existing address to avoid re-deriving from device
  for (const [accountId, metadata] of Object.entries(allAccountMetadata)) {
    const { chainId: metadataChainId, account } = fromAccountId(accountId)
    const metadataAccountNumber = metadata.bip44Params.accountNumber

    if (metadataChainId === chainId && metadataAccountNumber === accountNumber) {
      return account
    }
  }

  // Not in cache - fetch from device
  return await adapter.getAddress({ accountNumber, wallet })
}

export const deriveSolanaAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsSolana(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== solanaChainId) continue

    const adapter = assertGetSolanaChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = (await getCachedOrDeriveAddress(chainId, accountNumber, wallet, adapter)) || ''
    if (!address) continue

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
