import { Heading } from '@chakra-ui/react'
import { Text } from 'components/Text'
import { FC } from 'react'

import { ExplorationBanner } from './ExplorationBanner'

export const WalletConnectToDappsExploration: FC = () => {
  return (
    <>
      <ExplorationBanner />
      <Heading>
        <Text translation='plugins.walletConnectToDapps.availableDapps' />
      </Heading>
    </>
  )
}

/*

<Grid
            templateColumns={{ base: '1fr repeat(2, 1fr)', lg: '2fr repeat(3, 1fr) 150px' }}
            gap='1rem'
            pl={4}
            pr={4}
          >
            <Text translation='dashboard.portfolio.asset' color='gray.500' />
            <Text translation='dashboard.portfolio.balance' color='gray.500' textAlign='right' />
            <Text
              translation='dashboard.portfolio.price'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
            <Text translation='dashboard.portfolio.value' textAlign='right' color='gray.500' />
            <Text
              translation='dashboard.portfolio.allocation'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
          </Grid>

*/
