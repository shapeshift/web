import type { ChainId } from '@shapeshiftoss/caip'

import {
  isSupportedYieldNetwork,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  YIELD_NETWORK_TO_CHAIN_ID,
} from './constants'
import type { AugmentedYieldDto, ValidatorDto, YieldIconSource } from './types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

export const yieldNetworkToChainId = (network: string): ChainId | undefined => {
  if (!isSupportedYieldNetwork(network)) return undefined
  return YIELD_NETWORK_TO_CHAIN_ID[network]
}

const TX_TITLE_PATTERNS: [RegExp, string][] = [
  [/approv/i, 'Approve'],
  [/supply|deposit|enter/i, 'Deposit'],
  [/withdraw|exit/i, 'Withdraw'],
  [/claim/i, 'Claim'],
  [/unstake|undelegate/i, 'Unstake'],
  [/stake|delegate/i, 'Stake'],
  [/bridge/i, 'Bridge'],
  [/swap/i, 'Swap'],
]

// Map of transaction types to user-friendly button labels
// These should match the action verbs shown in the step row (without the asset symbol)
const TX_TYPE_TO_LABEL: Record<string, string> = {
  APPROVE: 'Approve',
  DELEGATE: 'Stake', // Monad uses DELEGATE for staking
  UNDELEGATE: 'Unstake', // Monad uses UNDELEGATE for unstaking
  STAKE: 'Stake',
  UNSTAKE: 'Unstake',
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdraw',
  SUPPLY: 'Supply',
  EXIT: 'Exit',
  ENTER: 'Enter',
  BRIDGE: 'Bridge',
  SWAP: 'Swap',
  CLAIM: 'Claim',
  CLAIM_REWARDS: 'Claim',
  TRANSFER: 'Transfer',
}

/**
 * Gets a clean button label from a transaction type or title.
 * Used for the main CTA button in the yield action modal.
 */
export const getTransactionButtonText = (
  type: string | undefined,
  title: string | undefined,
): string => {
  // First try to use the transaction type directly
  if (type) {
    const normalized = type.toUpperCase().replace(/[_-]/g, '_')
    if (TX_TYPE_TO_LABEL[normalized]) {
      return TX_TYPE_TO_LABEL[normalized]
    }
    // Fallback: capitalize the type
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  }

  // Fall back to parsing the title
  if (title) {
    const match = TX_TITLE_PATTERNS.find(([pattern]) => pattern.test(title))
    if (match) return match[1]
  }

  return 'Confirm'
}

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

export const searchValidators = (validators: ValidatorDto[], query: string): ValidatorDto[] => {
  if (!query) return validators
  const search = query.toLowerCase()
  return validators.filter(
    v =>
      (v.name || '').toLowerCase().includes(search) ||
      (v.address || '').toLowerCase().includes(search),
  )
}

export const searchYields = (yields: AugmentedYieldDto[], query: string): AugmentedYieldDto[] => {
  if (!query) return yields
  const search = query.toLowerCase()
  return yields.filter(
    y =>
      y.metadata.name.toLowerCase().includes(search) ||
      y.token.symbol.toLowerCase().includes(search) ||
      y.token.name.toLowerCase().includes(search) ||
      y.providerId.toLowerCase().includes(search),
  )
}

type ValidatorSortOptions = {
  shapeShiftFirst?: boolean
  preferredFirst?: boolean
}

export const sortValidators = (
  validators: ValidatorDto[],
  options: ValidatorSortOptions = { shapeShiftFirst: true, preferredFirst: true },
): ValidatorDto[] => {
  return [...validators].sort((a, b) => {
    if (options.shapeShiftFirst) {
      if (a.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) return -1
      if (b.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) return 1
    }
    if (options.preferredFirst) {
      if (a.preferred && !b.preferred) return -1
      if (!a.preferred && b.preferred) return 1
    }
    return 0
  })
}

export const toUserCurrency = (usdAmount: string | number, rate: string | number): string =>
  bnOrZero(usdAmount).times(rate).toFixed()
