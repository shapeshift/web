import type { ContainerProps } from '@chakra-ui/react'
import { Container } from '@chakra-ui/react'

export const PageContainer: React.FC<ContainerProps> = props => (
  <Container p={0} paddingStart={0} paddingEnd={0} maxWidth='4xl' py='7.5rem' {...props} />
)
