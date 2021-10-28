import { Flex } from '@chakra-ui/react'
import { Page } from 'components/Layout/Page'

import { PortfolioProvider } from './contexts/PortfolioContext'
import { Portfolio } from './Portfolio'

export interface MatchParams {
  assetId: string
}

export const Dashboard = () => {
  return (
    <Page style={{ flex: 1 }}>
      <Flex role='main' flex={1} height='100%' width='full'>
        <PortfolioProvider>
          <Portfolio />
        </PortfolioProvider>
      </Flex>
    </Page>
  )
}
