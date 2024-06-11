import type { StackDirection } from '@chakra-ui/react'
import { Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'

import { Overview } from './components/Overview/Overview'
import { Widget } from './Widget'

const direction: StackDirection = { base: 'column', xl: 'row' }
const maxWidth = { base: 'full', lg: 'full', xl: 'sm' }

export const RfoxDashboard: React.FC = () => {
  const translate = useTranslate()

  return (
    <Main py={16}>
      <Heading mb={8}>{translate('RFOX.staking')}</Heading>

      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Overview />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={maxWidth} spacing={4}>
          <Widget />
        </Stack>
      </Stack>
    </Main>
  )
}
