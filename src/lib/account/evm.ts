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
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { canAddMetaMaskAccount } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { isSmartContractAddress } from 'lib/address/utils'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'

import type { DeriveAccountIdsAndMetadata } from './account'

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
      wallet instanceof MetaMaskShapeShiftMultiChainHDWallet &&
      !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
    ) {
      continue
    }

    const adapter = assertGetEvmChainAdapter(chainId)
    const bip44Params = adapter.getBIP44Params({ accountNumber })

    // use address if we have it, there is no need to re-derive an address for every chainId since they all use the same derivation path
    address =
      address ||
      (await adapter.getAddress({ accountNumber, wallet }).catch(e => {
        console.error(
          `Failed to get address for account ${accountNumber} on chainId ${chainId}:`,
          e,
        )
        return ''
      }))
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
    const isSmartContractAddy = await isSmartContractAddress(account, chainId).catch(error => {
      console.error(
        `Failed to check isSmartContractAddress for address ${account} on chainId ${chainId}:`,
        error,
      )
      return false
    })
    if (isSmartContractAddy) {
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
