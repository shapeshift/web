import type { ChainId } from '@shapeshiftoss/caip'

import { isSupportedYieldNetwork, YIELD_NETWORK_TO_CHAIN_ID } from './constants'
import type { YieldIconSource } from './types'

export const yieldNetworkToChainId = (network: string): ChainId | undefined => {
  if (!isSupportedYieldNetwork(network)) return undefined
  return YIELD_NETWORK_TO_CHAIN_ID[network]
}

const TX_TITLE_PATTERNS: [RegExp, string][] = [
  [/approv/i, 'Approve'],
  [/supply|deposit|enter/i, 'Deposit'],
  [/withdraw|exit/i, 'Withdraw'],
  [/claim/i, 'Claim'],
  [/unstake/i, 'Unstake'],
  [/stake/i, 'Stake'],
]

export const formatYieldTxTitle = (title: string, assetSymbol: string): string => {
  const normalized = title.replace(/ transaction$/i, '').toLowerCase()
  const match = TX_TITLE_PATTERNS.find(([pattern]) => pattern.test(normalized))
  if (match) return `${match[1]} ${assetSymbol}`
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

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
