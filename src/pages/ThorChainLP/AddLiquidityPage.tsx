import { Center } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'

import { AddLiquidity } from './components/AddLiquitity/AddLiquidity'

export const AddLiquidityPage = () => {
  return (
    <Main>
      <Center>
        <AddLiquidity />
      </Center>
    </Main>
  )
}
