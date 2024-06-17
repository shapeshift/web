import type { StackDirection } from '@chakra-ui/react'
import { Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { Faq } from './components/Faq/Faq'
import { Overview } from './components/Overview/Overview'
import { RewardsAndClaims } from './components/RewardsAndClaims/RewardsAndClaims'
import { Widget } from './Widget'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: 'full', lg: 'full', xl: 'sm' }
const paddingVerticalResponsiveProps = { base: 8, md: 16 }

export const RFOX: React.FC = () => {
  const translate = useTranslate()
  const isRFOXDashboardEnabled = useFeatureFlag('RFOXDashboard')

  return (
    <Main py={paddingVerticalResponsiveProps} px={4}>
      <Heading mb={8}>{translate('RFOX.staking')}</Heading>

      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          {isRFOXDashboardEnabled && <Overview />}
          {isRFOXDashboardEnabled && <RewardsAndClaims />}
          <Faq />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={maxWidth} spacing={4}>
          <Widget />
        </Stack>
      </Stack>
    </Main>
  )
}
