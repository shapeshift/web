import { Button, HStack, Skeleton, SkeletonCircle, Stack, useDisclosure } from '@chakra-ui/react'
import { isSome } from '@shapeshiftoss/utils'
import { Suspense, useCallback, useState } from 'react'
import { FaGift } from 'react-icons/fa'

import { useTCYClaims } from '../../queries/useTcyClaims'
import type { TCYRouteProps } from '../../types'
import { ClaimModal } from './ClaimRoutes'
import { AssetClaimButton } from './components/AssetClaimButton'
import type { Claim } from './types'

import { ResultsEmpty } from '@/components/ResultsEmpty'
import { SlideTransition } from '@/components/SlideTransition'

const ClaimsListSkeleton = () => {
  return (
    <Stack px={2} pb={2} spacing={2}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Button
          key={index}
          height='auto'
          py={4}
          px={4}
          minHeight='auto'
          variant='ghost'
          size='sm'
          width='full'
          alignItems='center'
          justifyContent='space-between'
          gap={4}
          isDisabled
        >
          <HStack gap={4}>
            <SkeletonCircle size='32px' />
            <Stack alignItems='flex-start'>
              <Skeleton height='24px' width='120px' />
              <Skeleton height='16px' width='80px' />
            </Stack>
          </HStack>
          <Stack alignItems='flex-end'>
            <Skeleton height='24px' width='100px' />
            <Skeleton height='16px' width='60px' />
          </Stack>
        </Button>
      ))}
    </Stack>
  )
}

const suspenseFallback = <ClaimsListSkeleton />

const ClaimsList = ({
  onClaimClick,
  activeAccountNumber,
}: {
  onClaimClick: (claim: Claim) => void
  activeAccountNumber: number
}) => {
  const claimsQueries = useTCYClaims(activeAccountNumber)

  const claims = claimsQueries
    .map(query => query.data)
    .flat()
    .filter(isSome)

  if (claims.length === 0) {
    return (
      <ResultsEmpty
        icon={<FaGift />}
        title='TCY.claimsEmpty.emptyTitle'
        body='TCY.claimsEmpty.emptyBody'
      />
    )
  }

  return (
    <Stack px={2} pb={2} spacing={2}>
      {claims.map((claim, index) => (
        <AssetClaimButton key={index} claim={claim} onClick={onClaimClick} />
      ))}
    </Stack>
  )
}

export const ClaimSelect: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [activeClaim, setActiveClaim] = useState<Claim | undefined>()

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
        <Suspense fallback={suspenseFallback}>
          <ClaimsList onClaimClick={handleClick} activeAccountNumber={activeAccountNumber} />
        </Suspense>
      </Stack>
      <ClaimModal isOpen={isOpen} onClose={handleClose} claim={activeClaim} />
    </SlideTransition>
  )
}
