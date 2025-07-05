import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'

import { Faq } from './components/Faq/Faq'
import { History } from './components/History/History'
import { Overview } from './components/Overview/Overview'
import { RFOXHeader } from './components/RFOXHeader'
import { Widget } from './Widget'

import { Main } from '@/components/Layout/Main'
import { RFOXProvider } from '@/pages/RFOX/hooks/useRfoxContext'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

const rFOXHeader = <RFOXHeader />

export const RFOX: React.FC = () => (
  <RFOXProvider>
    <Main pb={mainPaddingBottom} headerComponent={rFOXHeader} px={4} isSubPage>
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Overview />
          <History />
          <Faq />
        </Stack>
        <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
          <Widget />
        </Stack>
      </Stack>
    </Main>
  </RFOXProvider>
)
