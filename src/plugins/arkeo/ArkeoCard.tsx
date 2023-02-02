import { useColorModeValue } from '@chakra-ui/system'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'

export const ArkeoCard: React.FC<CardProps> = props => (
  <Card
    bg={useColorModeValue('white', 'whiteAlpha.50')}
    borderColor={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
    boxShadow='sm'
    {...props}
  />
)
