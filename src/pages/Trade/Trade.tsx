import { Container, Stack } from '@chakra-ui/react'
import { memo } from 'react'
import { Main } from 'components/Layout/Main'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'
import { RecentTransactions } from 'pages/Dashboard/RecentTransactions'

const maxWidth = { base: '100%', lg: 'container.sm' }
const padding = { base: 0, md: 8 }

export const Trade = memo(() => {
  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full' hideBreadcrumbs>
      <Stack alignSelf='stretch' flex={1} minHeight={0} spacing={0}>
        <Container maxWidth={maxWidth} p={padding} position='relative' zIndex='2'>
          <MultiHopTrade />
        </Container>

        <Stack flexGrow={1}>
          <RecentTransactions />
        </Stack>
      </Stack>
    </Main>
  )
})
