import { CHAIN_REFERENCE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import {
  supportsAvalanche,
  supportsBSC,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
} from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { AccountMetadataById } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveEvmAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  const result = await (async () => {
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      if (!evmChainIds.includes(chainId as EvmChainId))
        throw new Error(`${chainId} does not exist in ${evmChainIds}`)

      const { chainReference } = fromChainId(chainId)
      const adapter = getChainAdapterManager().get(chainId)!

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
