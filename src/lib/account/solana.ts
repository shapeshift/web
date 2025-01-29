import { solanaChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { assertGetSolanaChainAdapter } from 'lib/utils/solana'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveSolanaAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsSolana(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== solanaChainId) continue

    const adapter = assertGetSolanaChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await adapter.getAddress({ accountNumber, wallet })

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
