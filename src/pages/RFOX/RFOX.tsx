import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'

import { Faq } from './components/Faq/Faq'
import { Overview } from './components/Overview/Overview'
import { RFOXHeader } from './components/RFOXHeader'
import { TxHistory } from './components/TxHistory/TxHistory'
import { Widget } from './Widget'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

const rFOXHeader = <RFOXHeader />

export const RFOX: React.FC = () => (
  <Main pb={mainPaddingBottom} headerComponent={rFOXHeader} px={4} isSubPage>
    <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <Overview />
        <TxHistory />
        <Faq />
      </Stack>
      <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
        <Widget />
      </Stack>
    </Stack>
  </Main>
)
