import type { ChainId } from '@shapeshiftoss/caip'

import {
  COSMOS_NETWORK_FALLBACK_APR,
  DEFAULT_VALIDATOR_BY_YIELD_ID,
  isSupportedYieldNetwork,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  YIELD_NETWORK_TO_CHAIN_ID,
} from './constants'
import type { AugmentedYieldDto, ValidatorDto, YieldIconSource, YieldType } from './types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

export const yieldNetworkToChainId = (network: string): ChainId | undefined => {
  if (!isSupportedYieldNetwork(network)) return undefined
  return YIELD_NETWORK_TO_CHAIN_ID[network]
}

/**
 * Get the default validator address for a yield ID.
 * Returns the enforced validator for yields that require validator selection.
 */
export const getDefaultValidatorForYield = (yieldId: string): string | undefined =>
  DEFAULT_VALIDATOR_BY_YIELD_ID[yieldId]

type TxTitlePattern = {
  pattern: RegExp
  staking: string
  vault: string
}

const TX_TITLE_PATTERNS: TxTitlePattern[] = [
  { pattern: /approv/i, staking: 'Approve', vault: 'Approve' },
  { pattern: /supply|deposit|enter/i, staking: 'Stake', vault: 'Deposit' },
  { pattern: /withdraw|exit/i, staking: 'Unstake', vault: 'Withdraw' },
  { pattern: /unstake|undelegate/i, staking: 'Unstake', vault: 'Withdraw' },
  { pattern: /claim/i, staking: 'Claim', vault: 'Claim' },
  { pattern: /stake|delegate/i, staking: 'Stake', vault: 'Deposit' },
  { pattern: /bridge/i, staking: 'Bridge', vault: 'Bridge' },
  { pattern: /swap/i, staking: 'Swap', vault: 'Swap' },
]

type TxTypeLabels = {
  staking: string
  vault: string
}

const TX_TYPE_TO_LABELS: Record<string, TxTypeLabels> = {
  APPROVE: { staking: 'Approve', vault: 'Approve' },
  APPROVAL: { staking: 'Approve', vault: 'Approve' },
  DELEGATE: { staking: 'Stake', vault: 'Deposit' },
  UNDELEGATE: { staking: 'Unstake', vault: 'Withdraw' },
  STAKE: { staking: 'Stake', vault: 'Deposit' },
  UNSTAKE: { staking: 'Unstake', vault: 'Withdraw' },
  DEPOSIT: { staking: 'Stake', vault: 'Deposit' },
  WITHDRAW: { staking: 'Unstake', vault: 'Withdraw' },
  SUPPLY: { staking: 'Stake', vault: 'Deposit' },
  EXIT: { staking: 'Unstake', vault: 'Withdraw' },
  ENTER: { staking: 'Stake', vault: 'Deposit' },
  BRIDGE: { staking: 'Bridge', vault: 'Bridge' },
  SWAP: { staking: 'Swap', vault: 'Swap' },
  CLAIM: { staking: 'Claim', vault: 'Claim' },
  CLAIM_REWARDS: { staking: 'Claim', vault: 'Claim' },
  TRANSFER: { staking: 'Transfer', vault: 'Transfer' },
}

type TerminologyKey = 'staking' | 'vault'

export const isStakingYieldType = (yieldType: YieldType): boolean => {
  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return true
    case 'vault':
    case 'lending':
      return false
    default:
      assertNever(yieldType)
      return false
  }
}

/**
 * Gets a clean button label from a transaction type or title.
 * Uses yield-type-aware terminology (stake/unstake vs deposit/withdraw).
 */
export const getTransactionButtonText = (
  type: string | undefined,
  title: string | undefined,
  yieldType?: YieldType,
): string => {
  const labelKey: TerminologyKey = yieldType && isStakingYieldType(yieldType) ? 'staking' : 'vault'

  if (type) {
    const normalized = type.toUpperCase().replace(/[_-]/g, '_')
    const labels = TX_TYPE_TO_LABELS[normalized]
    if (labels) return labels[labelKey]
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  }

  if (title) {
    const match = TX_TITLE_PATTERNS.find(p => p.pattern.test(title))
    if (match) return match[labelKey]
  }

  return 'Confirm'
}

export const formatYieldTxTitle = (
  title: string,
  assetSymbol: string,
  yieldType?: YieldType,
): string => {
  const labelKey: TerminologyKey = yieldType && isStakingYieldType(yieldType) ? 'staking' : 'vault'

  const normalized = title.replace(/ transaction$/i, '').toLowerCase()
  const match = TX_TITLE_PATTERNS.find(p => p.pattern.test(normalized))
  if (match) return `${match[labelKey]} ${assetSymbol}`
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

export const ensureValidatorApr = (validator: ValidatorDto): ValidatorDto =>
  validator.rewardRate?.total
    ? validator
    : {
        ...validator,
        rewardRate: {
          total: COSMOS_NETWORK_FALLBACK_APR,
          rateType: 'APR' as const,
          components: validator.rewardRate?.components ?? [],
        },
      }

/**
 * Translation keys for yield action labels based on yield type.
 * Enter = deposit/stake/restake action
 * Exit = withdraw/unstake action
 */
export type YieldActionLabelKeys = {
  enter: string
  exit: string
}

const assertNever = (value: never): never => {
  throw new Error(`Unhandled yield type: ${value}`)
}

/**
 * Gets the appropriate translation keys for yield actions based on yield type.
 *
 * Yield types and their terminology:
 * - staking, native-staking, pooled-staking, liquid-staking, restaking → Stake/Unstake
 * - vault, lending → Deposit/Withdraw
 */
export const getYieldActionLabelKeys = (yieldType: YieldType): YieldActionLabelKeys => {
  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return { enter: 'defi.stake', exit: 'defi.unstake' }
    case 'vault':
    case 'lending':
      return { enter: 'common.deposit', exit: 'common.withdraw' }
    default:
      return assertNever(yieldType)
  }
}

export type YieldLoadingStateKeys = {
  enter: string
  exit: string
}

export const getYieldLoadingStateKeys = (yieldType: YieldType): YieldLoadingStateKeys => {
  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return { enter: 'yieldXYZ.staking', exit: 'yieldXYZ.unstaking' }
    case 'vault':
    case 'lending':
      return { enter: 'yieldXYZ.depositing', exit: 'yieldXYZ.withdrawing' }
    default:
      return assertNever(yieldType)
  }
}

export type YieldHeadingKeys = {
  enter: string
  exit: string
}

export const getYieldHeadingKeys = (yieldType: YieldType): YieldHeadingKeys => {
  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return { enter: 'yieldXYZ.stakeSymbol', exit: 'yieldXYZ.unstakeSymbol' }
    case 'vault':
    case 'lending':
      return { enter: 'yieldXYZ.depositSymbol', exit: 'yieldXYZ.withdrawSymbol' }
    default:
      return assertNever(yieldType)
  }
}

export type YieldPendingStatusKeys = {
  enter: string
  exit: string
}

export const getYieldPendingStatusKeys = (yieldType: YieldType): YieldPendingStatusKeys => {
  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return { enter: 'yieldXYZ.stakingPending', exit: 'yieldXYZ.unstakingPending' }
    case 'vault':
    case 'lending':
      return { enter: 'yieldXYZ.depositingPending', exit: 'yieldXYZ.withdrawingPending' }
    default:
      return assertNever(yieldType)
  }
}

export const getYieldMinAmountKey = (yieldType: YieldType): string => {
  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return 'yieldXYZ.minStake'
    case 'vault':
    case 'lending':
      return 'yieldXYZ.minDeposit'
    default:
      return assertNever(yieldType)
  }
}

export type YieldSuccessMessageKey =
  | 'successStaked'
  | 'successUnstaked'
  | 'successDeposited'
  | 'successWithdrawn'
  | 'successClaim'

export const getYieldSuccessMessageKey = (
  yieldType: YieldType,
  action: 'enter' | 'exit' | 'claim' | 'manage' | 'withdraw',
): YieldSuccessMessageKey => {
  if (action === 'withdraw') return 'successWithdrawn'
  if (action === 'claim' || action === 'manage') return 'successClaim'

  switch (yieldType) {
    case 'staking':
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'restaking':
      return action === 'enter' ? 'successStaked' : 'successUnstaked'
    case 'vault':
    case 'lending':
      return action === 'enter' ? 'successDeposited' : 'successWithdrawn'
    default:
      return assertNever(yieldType)
  }
}

export const isYieldDisabled = (
  yieldItem: Pick<AugmentedYieldDto, 'status' | 'metadata'>,
): boolean =>
  !yieldItem.status.enter || yieldItem.metadata.underMaintenance || yieldItem.metadata.deprecated

export const getBestActionableYield = (
  yields: AugmentedYieldDto[],
): AugmentedYieldDto | undefined => {
  const actionable = yields.filter(y => !isYieldDisabled(y))
  if (actionable.length === 0) return undefined
  return actionable.reduce((best, current) =>
    bnOrZero(current.rewardRate.total).gt(best.rewardRate.total) ? current : best,
  )
}
