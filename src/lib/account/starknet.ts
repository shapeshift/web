import { starknetChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsStarknet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetStarknetChainAdapter } from '@/lib/utils/starknet'

export const deriveStarknetAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsStarknet(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== starknetChainId) continue

    const adapter = assertGetStarknetChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await adapter.getAddress({ accountNumber, wallet })

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
