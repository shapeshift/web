import { Box, Card, CardBody, CardHeader, Heading, Skeleton } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { ClaimStatus } from 'components/ClaimRow/types'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { Text } from 'components/Text'
import { selectArbitrumWithdrawTxs } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from './ClaimRow'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

const cardBorderRadius = { base: '2xl' }

type ClaimSelectProps = {
  onClickBack: () => void
  setActiveClaim: (claim: ClaimDetails) => void
}

export const ClaimSelect: React.FC<ClaimSelectProps> = ({ onClickBack, setActiveClaim }) => {
  const history = useHistory()

  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)

  const handleClaimClick = useCallback(
    (claim: ClaimDetails) => {
      setActiveClaim(claim)
      history.push(ClaimRoutePaths.Confirm)
    },
    [history, setActiveClaim],
  )

  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus(arbitrumWithdrawTxs)

  const AvailableClaims = useMemo(() => {
    if (isLoading) return <Skeleton height={16} />
    if (!claimsByStatus.Available.length)
      return <Text color='text.subtle' translation={'bridge.noAvailableClaims'} />

    return claimsByStatus.Available.map(claim => (
      <ClaimRow
        key={claim.tx.txid}
        claim={claim}
        status={ClaimStatus.Available}
        onClaimClick={handleClaimClick}
      />
    ))
  }, [claimsByStatus.Available, isLoading, handleClaimClick])

  const PendingClaims = useMemo(() => {
    if (isLoading) return <Skeleton height={16} />
    if (!claimsByStatus.Pending.length)
      return <Text color='text.subtle' translation={'bridge.noPendingClaims'} />

    return claimsByStatus.Pending.map(claim => (
      <ClaimRow
        key={claim.tx.txid}
        claim={claim}
        status={ClaimStatus.Pending}
        onClaimClick={handleClaimClick}
      />
    ))
  }, [claimsByStatus.Pending, isLoading, handleClaimClick])

  return (
    <TradeSlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
      >
        <CardHeader px={6} pt={4}>
          <WithBackButton onBack={onClickBack}>
            <Heading textAlign='center' fontSize='md'>
              <Text translation='bridge.availableClaims' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody px={6}>
          <Box mb={6}>{AvailableClaims}</Box>
          <Box>
            <Text as='h5' fontSize='md' translation='bridge.pendingClaims' />
            {PendingClaims}
          </Box>
        </CardBody>
      </Card>
    </TradeSlideTransition>
  )
}
