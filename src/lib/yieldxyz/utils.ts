import type { ChainId } from '@shapeshiftoss/caip'

import {
  CHAIN_ID_TO_YIELD_NETWORK,
  isSupportedYieldNetwork,
  YIELD_NETWORK_TO_CHAIN_ID,
} from './constants'
import type { YieldDto, YieldNetwork } from './types'

export const chainIdToYieldNetwork = (chainId: ChainId): YieldNetwork | undefined =>
  CHAIN_ID_TO_YIELD_NETWORK[chainId]

export const yieldNetworkToChainId = (network: string): ChainId | undefined => {
  if (!isSupportedYieldNetwork(network)) return undefined
  return YIELD_NETWORK_TO_CHAIN_ID[network]
}

export const assertYieldNetworkToChainId = (network: string): ChainId => {
  const chainId = yieldNetworkToChainId(network)
  if (!chainId) {
    throw new Error(`Yield.xyz network "${network}" is not supported by ShapeShift`)
  }
  return chainId
}

export const assertChainIdToYieldNetwork = (chainId: ChainId): YieldNetwork => {
  const network = chainIdToYieldNetwork(chainId)
  if (!network) {
    throw new Error(`ChainId "${chainId}" is not supported by Yield.xyz integration`)
  }
  return network
}

export const filterSupportedYields = (yields: YieldDto[]): YieldDto[] =>
  yields.filter(y => isSupportedYieldNetwork(y.network))

export const isExitableBalanceType = (type: string): boolean =>
  type === 'active' || type === 'withdrawable'

export const formatYieldTxTitle = (title: string, assetSymbol: string): string => {
  const t = title.replace(/ transaction$/i, '').toLowerCase()
  if (t.includes('approval') || t.includes('approve')) return `Approve ${assetSymbol}`
  if (t.includes('supply') || t.includes('deposit') || t.includes('enter'))
    return `Deposit ${assetSymbol}`
  if (t.includes('withdraw') || t.includes('exit')) return `Withdraw ${assetSymbol}`
  if (t.includes('claim')) return `Claim ${assetSymbol}`
  if (t.includes('unstake')) return `Unstake ${assetSymbol}`
  if (t.includes('stake')) return `Stake ${assetSymbol}`
  return t.charAt(0).toUpperCase() + t.slice(1)
}

type YieldIconSource = { assetId: string | undefined; src: string | undefined }

type YieldItemForIcon = {
  inputTokens: { assetId?: string; logoURI?: string }[]
  token: { assetId?: string; logoURI?: string }
  metadata: { logoURI?: string }
}

// HACK: yield.xyz SVG logos often fail to load in browser, so we prefer our local asset icons.
// Priority: inputToken.assetId > token.assetId > inputToken.logoURI > metadata.logoURI
export const resolveYieldInputAssetIcon = (yieldItem: YieldItemForIcon): YieldIconSource => {
  const inputToken = yieldItem.inputTokens[0]
  const inputTokenAssetId = inputToken?.assetId
  const vaultTokenAssetId = yieldItem.token?.assetId
  const inputTokenLogoURI = inputToken?.logoURI
  const metadataLogoURI = yieldItem.metadata?.logoURI

  if (inputTokenAssetId) return { assetId: inputTokenAssetId, src: undefined }
  if (vaultTokenAssetId) return { assetId: vaultTokenAssetId, src: undefined }
  if (inputTokenLogoURI) return { assetId: undefined, src: inputTokenLogoURI }
  return { assetId: undefined, src: metadataLogoURI }
}
