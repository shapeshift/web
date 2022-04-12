import { Stack } from '@chakra-ui/react'
import React from 'react'

export const SubMenuBody: React.FC = ({ children }) => {
  return (
    <Stack px={3} mb={3}>
      {children}
    </Stack>
  )
}
