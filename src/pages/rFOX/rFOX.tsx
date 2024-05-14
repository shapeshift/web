import { Card, Center } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'

import { Stake } from './components/Stake/Stake'

export const rFOX = () => {
  return (
    <Main>
      <Center>
        <Card>
          <Stake />
        </Card>
      </Center>
    </Main>
  )
}
