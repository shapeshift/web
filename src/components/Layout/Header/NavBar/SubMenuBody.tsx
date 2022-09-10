import { Stack } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

export const SubMenuBody: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <Stack px={3} mb={3}>
      {children}
    </Stack>
  )
}
