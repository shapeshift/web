import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'
import { Main } from 'components/Layout/Main'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { RawText } from 'components/Text'

import { DashboardHeader } from './components/DashboardHeader'

const EarnHeader = () => {
  const translate = useTranslate()

  return (
    <Flex
      alignItems={{ base: 'flex-start', md: 'center' }}
      gap={4}
      px={4}
      flexDir={{ base: 'column', md: 'row' }}
    >
      <Heading fontSize='xl'>{translate('defi.myPositions')}</Heading>
      <RawText color='gray.500'>{translate('defi.myPositionsBody')}</RawText>
      <Button
        colorScheme='purple'
        variant='ghost'
        as={NavLink}
        to='/earn'
        size='sm'
        ml='auto'
        rightIcon={<ArrowForwardIcon />}
      >
        {translate('defi.viewAllPositions')}
      </Button>
    </Flex>
  )
}

export const EarnDashboard = () => {
  return (
    <Main headerComponent={<DashboardHeader />}>
      <DeFiEarn includeEarnBalances header={<EarnHeader />} />
    </Main>
  )
}
