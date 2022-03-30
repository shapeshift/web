import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route } from 'Routes/helpers'
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

export const StakingVaults = ({ route }: { route?: Route }) => {
  return (
    <Main titleComponent={<DefiHeader />}>
      <AllEarnOpportunities />
    </Main>
  )
}
