import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'

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
      <AllEarnOpportunities />
    </Main>
  )
}
