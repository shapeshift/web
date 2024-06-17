import type { StackDirection } from '@chakra-ui/react'
import { Heading, Stack } from '@chakra-ui/react'
import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxClaimQuote } from './components/Claim/types'
import { Faq } from './components/Faq/Faq'
import { Overview } from './components/Overview/Overview'
import { RewardsAndClaims } from './components/RewardsAndClaims/RewardsAndClaims'
import { RfoxTabIndex, Widget } from './Widget'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: 'full', lg: 'full', xl: 'sm' }
const paddingVerticalResponsiveProps = { base: 8, md: 16 }

const stakingAssetId = foxOnArbitrumOneAssetId

export const RFOX: React.FC = () => {
  const translate = useTranslate()
  const isRFOXDashboardEnabled = useFeatureFlag('RFOXDashboard')

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  // TODO(gomes): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxClaimQuote>()

  if (!stakingAsset) return null

  return (
    <Main py={paddingVerticalResponsiveProps} px={4}>
      <Heading mb={8}>{translate('RFOX.staking')}</Heading>

      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          {isRFOXDashboardEnabled && (
            <Overview
              stakingAssetId={stakingAssetId}
              stakingAssetAccountId={stakingAssetAccountId}
            />
          )}
          {isRFOXDashboardEnabled && (
            <RewardsAndClaims
              stakingAssetId={stakingAssetId}
              stakingAssetAccountId={stakingAssetAccountId}
              setConfirmedQuote={setConfirmedQuote}
            />
          )}
          <Faq />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={maxWidth} spacing={4}>
          <Widget
            initialStepIndex={confirmedQuote ? RfoxTabIndex.Claim : RfoxTabIndex.Stake}
            confirmedQuote={confirmedQuote}
          />
        </Stack>
      </Stack>
    </Main>
  )
}
