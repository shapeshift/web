import { Badge, Tooltip } from '@chakra-ui/react'

interface VerifiedBadgeProps {
  isAffiliateVerified: boolean | null
}

export const VerifiedBadge = ({
  isAffiliateVerified,
}: VerifiedBadgeProps): React.JSX.Element => {
  if (isAffiliateVerified === null) {
    return (
      <Tooltip label='Verification pending' hasArrow>
        <Badge
          px={2.5}
          py={0.5}
          borderRadius='md'
          bg='rgba(122, 126, 138, 0.1)'
          color='fg.muted'
          fontSize='xs'
          fontWeight={500}
          textTransform='none'
        >
          Pending
        </Badge>
      </Tooltip>
    )
  }
  if (isAffiliateVerified) {
    return (
      <Tooltip label='Affiliate fee verified on-chain — you are getting paid' hasArrow>
        <Badge
          px={2.5}
          py={0.5}
          borderRadius='md'
          bg='rgba(74, 222, 128, 0.1)'
          color='success'
          fontSize='xs'
          fontWeight={500}
          textTransform='none'
        >
          Verified
        </Badge>
      </Tooltip>
    )
  }
  return (
    <Tooltip label='Affiliate fee NOT verified — payout not guaranteed' hasArrow>
      <Badge
        px={2.5}
        py={0.5}
        borderRadius='md'
        bg='rgba(239, 68, 68, 0.1)'
        color='danger'
        fontSize='xs'
        fontWeight={500}
        textTransform='none'
      >
        Unverified
      </Badge>
    </Tooltip>
  )
}
