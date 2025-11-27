import { toAccountId, tronChainId } from '@shapeshiftoss/caip'
import { supportsTron } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetTronChainAdapter } from '@/lib/utils/tron'

export const deriveTronAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsTron(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== tronChainId) continue

    const adapter = assertGetTronChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await adapter.getAddress({ accountNumber, wallet })

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
