import { Box, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'

import { LeaderboardTable } from './helpers/LeaderboardTable'

const LeaderboardHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('Leaderboard')}</Heading>
    </Box>
  )
}

export const Leaderboard = () => {
  return (
    <Main titleComponent={<LeaderboardHeader />}>
      <Card variant='outline' my={0}>
        <Card.Header flexDir='row' display='flex'>
          <Box>
            <Card.Heading>
              <Text translation='Top Chain' />
            </Card.Heading>
            <Text
              color='gray.500'
              translation='Keepkey support will be prioritized for the leading blockchain'
            />
          </Box>
        </Card.Header>
        <Card.Body pt={0} px={2}>
          <LeaderboardTable />
        </Card.Body>
      </Card>
    </Main>
  )
}
