import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'

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
  return (
    <Main titleComponent={<DefiHeader />}>
      <EligibleSlider />
      <DeFiEarn mt={6} />
    </Main>
  )
}
