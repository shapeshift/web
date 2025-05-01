import { Stack, useDisclosure } from '@chakra-ui/react'
import { isSome } from '@shapeshiftoss/utils'
import { useCallback, useState } from 'react'

import { useTCYClaims } from '../../queries/useTcyClaims'
import type { TCYRouteProps } from '../../types'
import { ClaimModal } from './ClaimRoutes'
import { AssetClaimButton } from './components/AssetClaimButton'
import type { Claim } from './types'

import { SlideTransition } from '@/components/SlideTransition'

export const ClaimSelect: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [activeClaim, setActiveClaim] = useState<Claim | undefined>()

  const claimsQueries = useTCYClaims(activeAccountNumber)

  const claims = claimsQueries
    .map(query => query.data)
    .flat()
    .filter(isSome)

  const handleClick = useCallback(
    (claim: Claim) => {
      setActiveClaim(claim)
      onOpen()
    },
    [onOpen],
  )

  const handleClose = useCallback(() => {
    setActiveClaim(undefined)
    onClose()
  }, [onClose])

  return (
    <SlideTransition>
      {headerComponent}
      <Stack spacing={2}>
        <Stack px={2} pb={2} spacing={2}>
          {claims.map((claim, index) => (
            <AssetClaimButton key={index} claim={claim} onClick={handleClick} />
          ))}
        </Stack>
      </Stack>
      <ClaimModal isOpen={isOpen} onClose={handleClose} claim={activeClaim} />
    </SlideTransition>
  )
}
