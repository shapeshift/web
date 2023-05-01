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
      <Heading>{translate('defi.earn')}</Heading>
    </Box>
  )
}

export const StakingVaults = () => {
  return (
    <Main titleComponent={<DefiHeader />} hideBreadcrumbs>
      <SEO title={'Earn'} description={'Earn'} />
      <EligibleSlider />
      <DeFiEarn mt={6} />
    </Main>
  )
}
