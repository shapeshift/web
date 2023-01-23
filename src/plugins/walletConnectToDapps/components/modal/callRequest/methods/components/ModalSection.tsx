import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Text } from 'components/Text/Text'

export const ModalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box>
    <Text fontWeight='medium' translation={title} mb={4} />
    {children}
  </Box>
)
