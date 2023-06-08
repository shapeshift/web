import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'

import { EligibleSlider } from '../components/EligibleSlider'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box pb={6}>
      <Heading>{translate('navBar.defi')}</Heading>
    </Box>
  )
}

export const StakingVaults = () => {
  const translate = useTranslate()

  return (
    <Main titleComponent={<DefiHeader />} hideBreadcrumbs>
      <SEO title={translate('navBar.defi')} description={translate('navBar.defi')} />
      <EligibleSlider />
      <DeFiEarn mt={6} />
    </Main>
  )
}
