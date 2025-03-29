import { CardHeader, Flex, Heading } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { BorrowRoutePaths } from './types'

import { WithBackButton } from '@/components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from '@/components/SlideTransition'
import { Sweep } from '@/components/Sweep'
import { Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getThorchainFromAddress } from '@/lib/utils/thorchain'
import { getThorchainLendingPosition } from '@/lib/utils/thorchain/lending'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BorrowSweepProps = {
  collateralAssetId: AssetId
  collateralAccountId: AccountId
}

export const BorrowSweep = ({ collateralAssetId, collateralAccountId }: BorrowSweepProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate(BorrowRoutePaths.Input)
  }, [navigate])

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['thorchainFromAddress', collateralAccountId, collateralAssetId],
    queryFn:
      collateralAccountId && wallet && collateralAccountMetadata && collateralAssetId
        ? () =>
            getThorchainFromAddress({
              accountId: collateralAccountId,
              assetId: collateralAssetId,
              getPosition: getThorchainLendingPosition,
              accountMetadata: collateralAccountMetadata,
              wallet,
            })
        : skipToken,
  })

  const handleSwepSeen = useCallback(() => {
    navigate(BorrowRoutePaths.Confirm)
  }, [navigate])

  return (
    <SlideTransition>
      <Flex flexDir='column' width='full'>
        <CardHeader>
          <WithBackButton onBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='Consolidate Funds' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <Sweep
          accountId={collateralAccountId}
          assetId={collateralAssetId}
          fromAddress={fromAddress ?? null}
          onBack={handleBack}
          onSweepSeen={handleSwepSeen}
        />
      </Flex>
    </SlideTransition>
  )
}
