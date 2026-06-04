import { Box } from '@chakra-ui/react'

interface ErrorBannerProps {
  children: React.ReactNode
}

export const ErrorBanner = ({ children }: ErrorBannerProps): React.JSX.Element => (
  <Box
    role='alert'
    bg='rgba(239, 68, 68, 0.08)'
    border='1px solid'
    borderColor='rgba(239, 68, 68, 0.2)'
    borderRadius='xl'
    px={{ base: 4, md: 5 }}
    py={3.5}
    color='danger'
    fontSize='sm'
    mb={6}
  >
    {children}
  </Box>
)
