import { Button, HStack, Skeleton, SkeletonCircle, Stack } from '@chakra-ui/react'
import { isSome } from '@shapeshiftoss/utils'
import { Suspense, useCallback } from 'react'
import { FaGift } from 'react-icons/fa'
import { matchPath, useLocation, useNavigate } from 'react-router'

import { useTCYClaims } from '../../queries/useTcyClaims'
import type { TCYRouteProps } from '../../types'
import { ClaimModal } from './ClaimRoutes'
import { AssetClaimButton } from './components/AssetClaimButton'
import type { Claim } from './types'

import { ResultsEmpty } from '@/components/ResultsEmpty'
import { ResultsEmptyNoWallet } from '@/components/ResultsEmptyNoWallet'
import { SlideTransition } from '@/components/SlideTransition'
import { useWallet } from '@/hooks/useWallet/useWallet'

const faGift = <FaGift />

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
  const {
    state: { isConnected },
  } = useWallet()
  const claimsQueries = useTCYClaims(activeAccountNumber)

  if (!isConnected) {
    return (
      <ResultsEmptyNoWallet
        icon={faGift}
        title='common.connectWallet'
        body='TCY.claimsEmpty.connectWalletBody'
      />
    )
  }

  const claims = claimsQueries
    .map(query => query.data)
    .flat()
    .filter(isSome)

  if (claims.length === 0) {
    return (
      <ResultsEmpty
        icon={faGift}
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
  const navigate = useNavigate()
  const location = useLocation()
  const claimsQueries = useTCYClaims(activeAccountNumber)
  const claims = claimsQueries
    .map(query => query.data)
    .flat()
    .filter(isSome)

  const maybeClaimMatch = matchPath('/tcy/claim/:l1_address', location.pathname)
  const l1_address = maybeClaimMatch?.params?.l1_address
  // Prefer claim from navigation state, fallback to lookup
  const selectedClaim = location.state?.selectedClaim as Claim | undefined
  const activeClaim = selectedClaim || claims.find(c => c.l1_address === l1_address)
  const isOpen = !!l1_address

  const handleClick = useCallback(
    (claim: Claim) => {
      navigate(`/tcy/claim/${claim.l1_address}`, { state: { selectedClaim: claim } })
    },
    [navigate],
  )

  const handleClose = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

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
