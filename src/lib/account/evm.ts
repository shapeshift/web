import type { AccountId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  fromAccountId,
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
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { canAddMetaMaskAccount } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { store } from '@/state/store'

export const deriveEvmAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args
  if (!supportsETH(wallet)) return {}

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
      wallet instanceof MetaMaskMultiChainHDWallet &&
      !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
    ) {
      continue
    }

    const adapter = assertGetEvmChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    // use address if we have it, there is no need to re-derive an address for every chainId since they all use the same derivation path
    address =
      address ||
      (await (async () => {
        // Check ALL cached metadata (including inactive accounts) to avoid re-deriving from device
        const state = store.getState()
        const allAccountMetadata = state.portfolio.accountMetadata.byId

        // Search through all cached metadata for matching account
        for (const [accountId, metadata] of Object.entries(allAccountMetadata)) {
          const { chainId: metadataChainId, account } = fromAccountId(accountId)
          const metadataAccountNumber = metadata.bip44Params.accountNumber

          if (metadataChainId === chainId && metadataAccountNumber === accountNumber) {
            // Found cached address - use it instead of re-deriving from device
            return account
          }
        }

        // Not in cache - fetch from device
        return adapter.getAddress({ accountNumber, wallet })
      })())
    if (!address) continue

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  // WCV2 defines all EVM chains as supported, but a smart contract may only be deployed on a specific chain
  // For all intents and purposes, if one smart contract is found, assume none other exists on other chains
  // and there is only one AccountId for that wallet
  let maybeWalletConnectV2SmartContractAccountId: AccountId | undefined

  for (const accountId of Object.keys(result)) {
    const { chainId, account } = fromAccountId(accountId)
    if (await fetchIsSmartContractAddressQuery(account, chainId)) {
      maybeWalletConnectV2SmartContractAccountId = accountId
      break
    }
  }

  if (maybeWalletConnectV2SmartContractAccountId)
    return {
      [maybeWalletConnectV2SmartContractAccountId]:
        result[maybeWalletConnectV2SmartContractAccountId],
    }

  return result
}
