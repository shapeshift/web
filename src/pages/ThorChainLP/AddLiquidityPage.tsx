import { Card, Center } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'

import { AddLiquidity } from './components/AddLiquitity/AddLiquidity'

export const AddLiquidityPage = () => {
  return (
    <Main>
      <Center>
        <Card width='full' maxWidth='md'>
          <AddLiquidity />
        </Card>
      </Center>
    </Main>
  )
}
