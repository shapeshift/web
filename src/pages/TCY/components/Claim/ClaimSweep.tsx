import { ArrowBackIcon } from '@chakra-ui/icons'
import { CardBody, CardHeader, Flex, IconButton } from '@chakra-ui/react'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { Claim } from './types'

import { SlideTransition } from '@/components/SlideTransition'
import { Sweep } from '@/components/Sweep'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getThorchainFromAddress } from '@/lib/utils/thorchain'
import { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimSweepProps = {
  claim: Claim
  onBack: () => void
  onSweepSeen: () => void
}

const backIcon = <ArrowBackIcon />

export const ClaimSweep: React.FC<ClaimSweepProps> = ({
  claim,
  onBack: handleBack,
  onSweepSeen: handleSweepSeen,
}) => {
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const accountFilter = useMemo(() => ({ accountId: claim.accountId }), [claim.accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['thorchainFromAddress', claim.accountId, claim.assetId],
    queryFn:
      wallet && accountMetadata
        ? () =>
            getThorchainFromAddress({
              accountId: claim.accountId,
              assetId: claim.assetId,
              getPosition: getThorchainSaversPosition,
              accountMetadata,
              wallet,
            })
        : skipToken,
  })
  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody pt={0}>
        <Sweep
          assetId={claim.assetId}
          fromAddress={fromAddress ?? null}
          accountId={claim.accountId}
          onBack={handleBack}
          onSweepSeen={handleSweepSeen}
        />
      </CardBody>
    </SlideTransition>
  )
}
