import { Flex } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'
import { Page } from 'components/Layout/Page'

import { Portfolio } from './Portfolio'

export type MatchParams = {
  assetId: string
}

export const Dashboard = () => {
  return (
    <Main>
      <Portfolio />
    </Main>
  )
}
