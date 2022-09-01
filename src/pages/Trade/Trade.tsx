import { Center, Container } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'
import { TradeCard } from 'pages/Dashboard/TradeCard'

export const Trade = () => {
  return (
    <Main>
      <Center height='100%'>
        <Container maxWidth='container.sm'>
          <TradeCard />
        </Container>
      </Center>
    </Main>
  )
}
