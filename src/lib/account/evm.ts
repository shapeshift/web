import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
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

  let address = ''
  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId === ethChainId && !supportsETH(wallet)) continue
    if (chainId === avalancheChainId && !supportsAvalanche(wallet)) continue
    if (chainId === optimismChainId && !supportsOptimism(wallet)) continue
    if (chainId === bscChainId && !supportsBSC(wallet)) continue
    if (chainId === polygonChainId && !supportsPolygon(wallet)) continue
    if (chainId === gnosisChainId && !supportsGnosis(wallet)) continue
    if (chainId === arbitrumChainId && !supportsArbitrum(wallet)) continue
    if (chainId === arbitrumNovaChainId && !supportsArbitrumNova(wallet)) continue

    const adapter = assertGetEvmChainAdapter(chainId)
    const bip44Params = adapter.getBIP44Params({ accountNumber })

    // use address if we have it, there is no need to re-derive an address for every chainId since they all use the same derivation path
    address = address || (await adapter.getAddress({ accountNumber, wallet }))
    if (!address) continue

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
