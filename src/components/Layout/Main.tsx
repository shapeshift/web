import { Flex, Stack } from '@chakra-ui/layout'

import { Page } from './Page'

export const Main: React.FC = ({ children }) => {
  return (
    <Page style={{ flex: 1 }}>
      <Flex role='main' flex={1} height='100%' width='full' flexDir='column'>
        <Stack spacing={6} width='full' p={4}>
          {children}
        </Stack>
      </Flex>
    </Page>
  )
}
