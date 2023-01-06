import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'
import { selectFeatureFlags } from 'state/slices/selectors'

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
  const { EligibleEarn } = useSelector(selectFeatureFlags)
  return (
    <Main titleComponent={<DefiHeader />}>
      {EligibleEarn && <EligibleSlider />}
      <AllEarnOpportunities />
    </Main>
  )
}
