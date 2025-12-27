import { nearChainId, toAccountId } from '@shapeshiftoss/caip'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetNearChainAdapter, supportsNear } from '@/lib/utils/near'

export const deriveNearAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsNear(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== nearChainId) continue

    const adapter = assertGetNearChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await adapter.getAddress({ accountNumber, wallet })

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
