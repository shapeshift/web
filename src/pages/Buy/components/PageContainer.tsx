import type { ContainerProps } from '@chakra-ui/react'
import { Container } from '@chakra-ui/react'

export const PageContainer: React.FC<ContainerProps> = props => (
  <Container
    px={{ base: 4, xl: 0 }}
    paddingStart={{ base: 4, xl: 0 }}
    paddingEnd={{ base: 4, xl: 0 }}
    maxWidth='4xl'
    py='7.5rem'
    {...props}
  />
)
