import type {
  AffiliateFeeStatus,
  AffiliateFeeStatusReason,
  SwapServiceAffiliateSwap,
} from './types'

type ResolvedAffiliateFeeStatus = {
  status: AffiliateFeeStatus
  reason: AffiliateFeeStatusReason | null
}

// swap-service sets partnerFeeUsd only for the fee the payout will pay, so anything else is pending,
// final and unpaid, or verified but held back for a person to check (a fee anomaly, say)
export const resolveAffiliateFeeStatus = (
  swap: SwapServiceAffiliateSwap,
): ResolvedAffiliateFeeStatus => {
  if (swap.partnerFeeUsd !== null) return { status: 'earned', reason: null }

  const failed = (reason: AffiliateFeeStatusReason) => ({ status: 'failed' as const, reason })
  if (swap.status === 'FAILED') return failed('swap-failed')
  if (swap.attributionStatus === 'REJECTED' || swap.attributionStatus === 'DISPUTED') {
    return failed('not-attributed')
  }
  if (swap.verificationStatus === 'FAILED') return failed('fee-not-verified')
  if (swap.isAffiliateVerified === false) return failed('no-affiliate-fee')
  if (swap.affiliateVerificationDetails?.affiliateBps === 0) return failed('fee-waived')

  const pending = (reason: AffiliateFeeStatusReason) => ({ status: 'pending' as const, reason })
  if (swap.status !== 'SUCCESS') return pending('swap-pending')
  if (swap.verificationStatus !== 'SUCCESS') return pending('verification-pending')
  if (swap.attributionStatus !== 'ACCEPTED') return pending('attribution-pending')

  if (swap.partnerBps <= 0) return { status: 'review', reason: 'no-partner-share' }
  return { status: 'review', reason: 'fee-under-review' }
}
