import { Tag } from '@chakra-ui/tag'
import { Amount } from 'components/Amount/Amount'

type AprTagProps = {
  percentage: string
  withAprText?: true
}

export const AprTag: React.FC<AprTagProps> = ({ percentage, withAprText }) => (
  <Tag colorScheme='green'>
    <Amount.Percent value={percentage} />
  </Tag>
)
