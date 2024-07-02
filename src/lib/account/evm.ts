import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
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
  supportsBase,
  supportsBSC,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
} from '@shapeshiftoss/hdwallet-core'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { canAddMetaMaskAccount } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveEvmAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args

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
    if (chainId === baseChainId && !supportsBase(wallet)) continue
    if (
      wallet instanceof MetaMaskShapeShiftMultiChainHDWallet &&
      !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
    ) {
      continue
    }

    const adapter = assertGetEvmChainAdapter(chainId)
    const bip44Params = adapter.getBIP44Params({ accountNumber })

    // use address if we have it, there is no need to re-derive an address for every chainId since they all use the same derivation path
    address = address || (await adapter.getAddress({ accountNumber, wallet }))
    if (!address) continue

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { isViewOnly: false, bip44Params }
  }

  return result
}
