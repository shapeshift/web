import type { CardProps } from '@chakra-ui/react'
import { Card } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'

export const ArkeoCard: React.FC<CardProps> = props => (
  <Card
    bg={useColorModeValue('white', 'whiteAlpha.50')}
    borderColor={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
    boxShadow='sm'
    {...props}
  />
)
