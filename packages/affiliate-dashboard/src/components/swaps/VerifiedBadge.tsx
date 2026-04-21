import { CheckCircleIcon, TimeIcon, WarningIcon } from '@chakra-ui/icons'
import { Icon, Tooltip } from '@chakra-ui/react'

interface VerifiedBadgeProps {
  isAffiliateVerified: boolean | null
}

export const VerifiedBadge = ({ isAffiliateVerified }: VerifiedBadgeProps): React.JSX.Element => {
  if (isAffiliateVerified === null) {
    return (
      <Tooltip label='Verification pending' hasArrow>
        <Icon as={TimeIcon} color='fg.muted' boxSize={5} aria-label='Verification pending' />
      </Tooltip>
    )
  }
  if (isAffiliateVerified) {
    return (
      <Tooltip label='Affiliate fee verified on-chain — you are getting paid' hasArrow>
        <Icon as={CheckCircleIcon} color='success' boxSize={5} aria-label='Verified' />
      </Tooltip>
    )
  }
  return (
    <Tooltip label='Affiliate fee NOT verified — payout not guaranteed' hasArrow>
      <Icon as={WarningIcon} color='danger' boxSize={5} aria-label='Unverified' />
    </Tooltip>
  )
}
