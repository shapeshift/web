import { Stack } from '@chakra-ui/react'
import { Route } from 'Routes/helpers'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'

import { AppsList } from './components/AppsList'

export const Apps = ({ route }: { route?: Route }) => {
  return (
    <Main route={route}>
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={{ base: 'column' }}>
        <Text fontSize='2xl' fontWeight='bold' translation='apps.header' />
        <AppsList />
      </Stack>
    </Main>
  )
}
