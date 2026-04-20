import { Box, Container } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps): React.JSX.Element => (
  <Box
    h='100vh'
    bg='bg.canvas'
    color='fg.default'
    position='relative'
    overflow='hidden'
    display='flex'
    flexDirection='column'
  >
    <Box
      position='fixed'
      inset={0}
      pointerEvents='none'
      bgImage='radial-gradient(ellipse 80% 60% at 50% -20%, rgba(55, 97, 249, 0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(55, 97, 249, 0.06) 0%, transparent 60%)'
    />
    <Container
      position='relative'
      maxW='1440px'
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 12 }}
      pb={{ base: 12, md: 16 }}
      flex={1}
      minH={0}
      display='flex'
      flexDirection='column'
    >
      {children}
    </Container>
  </Box>
)
