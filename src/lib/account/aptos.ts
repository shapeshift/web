import { aptosChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsAptos } from '@shapeshiftoss/hdwallet-core/wallet'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetAptosChainAdapter } from '@/lib/utils/aptos'

export const deriveAptosAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsAptos(wallet)) return {}

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== aptosChainId) continue

    const adapter = assertGetAptosChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const address = await adapter.getAddress({ accountNumber, wallet })

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
