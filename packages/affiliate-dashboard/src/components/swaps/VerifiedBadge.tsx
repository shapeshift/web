import { CheckCircleIcon, CloseIcon, TimeIcon, WarningIcon } from '@chakra-ui/icons'
import { Icon, Tooltip } from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'

interface VerifiedBadgeProps {
  status: AffiliateSwap['affiliateFeeStatus']
  reason: AffiliateSwap['affiliateFeeStatusReason']
}

// what each reason means for the partner, in their terms
const REASON_LABELS: Record<string, string> = {
  'swap-pending': 'Swap in progress',
  'verification-pending': 'Verifying the fee on-chain',
  'attribution-pending': 'Confirming attribution',
  'fee-under-review': 'Fee under review',
  'no-partner-share': 'No partner fee share applies to this swap',
  'swap-failed': "This swap didn't complete, so no fee was earned",
  'not-attributed': "This swap wasn't attributed to you",
  'fee-not-verified': "The fee couldn't be verified on-chain",
  'no-affiliate-fee': 'No affiliate fee was found on-chain for this swap',
  'fee-waived': 'No fee was charged on this swap',
}

const STATUS_LABELS: Record<VerifiedBadgeProps['status'], string> = {
  earned: 'Fee verified on-chain',
  pending: 'Pending',
  review: 'Fee under review',
  failed: 'No fee earned on this swap',
}

export const VerifiedBadge = ({ status, reason }: VerifiedBadgeProps): React.JSX.Element => {
  const label = (reason && REASON_LABELS[reason]) ?? STATUS_LABELS[status]

  const icon = (() => {
    switch (status) {
      case 'earned':
        return <Icon as={CheckCircleIcon} color='success' boxSize={5} aria-label={label} />
      case 'review':
        return <Icon as={WarningIcon} color='warn' boxSize={5} aria-label={label} />
      case 'failed':
        return <Icon as={CloseIcon} color='danger' boxSize={4} aria-label={label} />
      case 'pending':
      default:
        return <Icon as={TimeIcon} color='fg.muted' boxSize={5} aria-label={label} />
    }
  })()

  return (
    <Tooltip label={label} hasArrow>
      {icon}
    </Tooltip>
  )
}
