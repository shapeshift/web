import type { ContainerProps } from '@chakra-ui/react'
import { Container } from '@chakra-ui/react'

const containerPx = { base: 4, xl: 0 }
const paddingStart = { base: 4, xl: 0 }
const paddingEnd = { base: 4, xl: 0 }

export const PageContainer: React.FC<ContainerProps> = props => (
  <Container
    px={containerPx}
    paddingStart={paddingStart}
    paddingEnd={paddingEnd}
    py='7.5rem'
    {...props}
  />
)
