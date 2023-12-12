import { CHAIN_REFERENCE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import {
  supportsArbitrum,
  supportsArbitrumNova,
  supportsAvalanche,
  supportsBSC,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
} from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveEvmAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  const result = await (async () => {
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      const { chainReference } = fromChainId(chainId)
      const adapter = assertGetEvmChainAdapter(chainId)

      if (chainReference === CHAIN_REFERENCE.EthereumMainnet) {
        if (!supportsETH(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.AvalancheCChain) {
        if (!supportsAvalanche(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.OptimismMainnet) {
        if (!supportsOptimism(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.BnbSmartChainMainnet) {
        if (!supportsBSC(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.PolygonMainnet) {
        if (!supportsPolygon(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.GnosisMainnet) {
        if (!supportsGnosis(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.ArbitrumMainnet) {
        if (!supportsArbitrum(wallet)) continue
      }

      if (chainReference === CHAIN_REFERENCE.ArbitrumNovaMainnet) {
        if (!supportsArbitrumNova(wallet)) continue
      }

      const bip44Params = adapter.getBIP44Params({ accountNumber })
      const pubkey = await adapter.getAddress({ accountNumber, wallet })

      if (!pubkey) continue

      const accountId = toAccountId({ chainId, account: pubkey })
      acc[accountId] = { bip44Params }
    }
    return acc
  })()

  return result
}
