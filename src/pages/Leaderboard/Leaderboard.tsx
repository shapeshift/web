import { Box, SimpleGrid, Stack } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'

export const Leaderboard = () => {
  return (
    <Main>
      <Stack>
        <RawText>Leaderboard</RawText>
        <SimpleGrid columns={2} spacing={10}>
          <Box bg='blue.400' height='80px'>Blah1</Box>
          <Box bg='blue.400' height='80px'>Blah2</Box>
          <Box bg='blue.400' height='80px'>Blah3</Box>
          <Box bg='blue.400' height='80px'>Blah4</Box>
          <Box bg='blue.400' height='80px'>Blah5</Box>
          <Box bg='blue.400' height='80px'>Blah6</Box>
        </SimpleGrid>
      </Stack>
    </Main>
  )
}
