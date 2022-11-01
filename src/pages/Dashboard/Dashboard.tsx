import { Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { Seo } from 'components/Layout/Seo'

import { DashboardSidebar } from './DashboardSidebar'
import { Portfolio } from './Portfolio'

export const Dashboard = () => {
  const translate = useTranslate()
  return (
    <Main>
      <Seo title={translate('navBar.dashboard')} />
      <Stack
        alignItems='flex-start'
        spacing={4}
        mx='auto'
        direction={{ base: 'column', xl: 'row' }}
      >
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Portfolio />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <DashboardSidebar />
        </Stack>
      </Stack>
    </Main>
  )
}
