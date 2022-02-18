import { Box, Heading } from '@chakra-ui/react'
import { Route } from 'Routes/helpers'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'

const DefiHeader = () => {
  return (
    <Box>
      <Heading>Defi</Heading>
    </Box>
  )
}

export const StakingVaults = ({ route }: { route: Route }) => {
  return (
    <Main route={route} titleComponent={<DefiHeader />}>
      <AllEarnOpportunities />
    </Main>
  )
}
