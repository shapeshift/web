import { CardHeader, Flex, Heading } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from 'components/SlideTransition'
import { Sweep } from 'components/Sweep'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { BorrowRoutePaths } from './types'

type BorrowSweepProps = {
  collateralAssetId: AssetId
  collateralAccountId: AccountId | null
}

export const BorrowSweep = ({ collateralAssetId, collateralAccountId }: BorrowSweepProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId ?? '' }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )

  const { data: fromAddress } = useQuery({
    ...reactQueries.common.thorchainFromAddress({
      accountId: collateralAccountId!,
      assetId: collateralAssetId,
      getPosition: getThorchainLendingPosition,
      accountMetadata: collateralAccountMetadata!,
      wallet: wallet!,
    }),
    enabled: Boolean(collateralAccountId && collateralAccountMetadata && wallet),
  })

  const handleSwepSeen = useCallback(() => {
    history.push(BorrowRoutePaths.Confirm)
  }, [history])

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
          accountId={collateralAccountId ?? ''}
          assetId={collateralAssetId}
          fromAddress={fromAddress ?? null}
          onBack={handleBack}
          onSweepSeen={handleSwepSeen}
        />
      </Flex>
    </SlideTransition>
  )
}
