import { Flex } from '@chakra-ui/react'
import { memo } from 'react'
import { Main } from 'components/Layout/Main'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'

const padding = { base: 0, md: 8 }

export const Trade = memo(() => {
  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full' hideBreadcrumbs>
      <Flex
        pt={12}
        px={padding}
        alignItems='flex-start'
        width='full'
        justifyContent='center'
        gap={4}
      >
        <MultiHopTrade />
      </Flex>
    </Main>
  )
})
