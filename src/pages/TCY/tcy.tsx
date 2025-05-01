import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

import { Activity } from './components/Activity/Activity'
import { Claim } from './components/Claim/Claim'
import { Overview } from './components/Overview'
import { TCYHeader } from './components/TCYHeader'
import { Widget } from './components/Widget'

import { Main } from '@/components/Layout/Main'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

export const TCY = () => {
  const [activeAccountNumber, setActiveAccountNumber] = useState(0)
  const tcyHeader = useMemo(
    () => <TCYHeader onAccountNumberChange={setActiveAccountNumber} />,
    [setActiveAccountNumber],
  )

  return (
    <Main pb={mainPaddingBottom} headerComponent={tcyHeader} px={4} isSubPage>
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Overview />
          <Claim activeAccountNumber={activeAccountNumber} />
          <Activity />
        </Stack>
        <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
          <Widget />
        </Stack>
      </Stack>
    </Main>
  )
}
