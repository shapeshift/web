import { Box, Text } from '@chakra-ui/react'

interface EmptyStateProps {
  children: React.ReactNode
}

export const EmptyState = ({ children }: EmptyStateProps): React.JSX.Element => (
  <Box textAlign='center' py={{ base: 10, md: 16 }} px={5}>
    <Text fontSize='md' color='fg.dim' lineHeight={1.6}>
      {children}
    </Text>
  </Box>
)
