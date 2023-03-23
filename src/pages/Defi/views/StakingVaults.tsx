import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { EligibleSlider } from '../components/EligibleSlider'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

export const StakingVaults = () => {
  const isDefiAggregationEnabled = useFeatureFlag('DefiAggregation')
  return (
    <Main titleComponent={<DefiHeader />}>
      <EligibleSlider />

      {isDefiAggregationEnabled ? (
        <DeFiEarn includeEarnBalances includeRewardsBalances mt={6} />
      ) : (
        <AllEarnOpportunities />
      )}
    </Main>
  )
}
