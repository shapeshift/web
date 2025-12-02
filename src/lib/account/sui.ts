import { suiChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsSui } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetSuiChainAdapter } from '@/lib/utils/sui'

export const deriveSuiAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsSui(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== suiChainId) continue

    const adapter = assertGetSuiChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await adapter.getAddress({ accountNumber, wallet })

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
