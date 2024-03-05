import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { useFetchOpportunities } from 'components/StakingVaults/hooks/useFetchOpporunities'

import { EligibleSlider } from '../components/EligibleSlider'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box pb={6}>
      <Heading>{translate('defi.earn')}</Heading>
    </Box>
  )
}

const defiHeader = <DefiHeader />

export const StakingVaults = () => {
  const translate = useTranslate()

  useFetchOpportunities()

  return (
    <Main titleComponent={defiHeader} hideBreadcrumbs>
      <SEO title={translate('defi.earn')} description={translate('navBar.defi')} />
      <EligibleSlider />
      <DeFiEarn mt={6} />
    </Main>
  )
}
