import { Tag } from '@chakra-ui/tag'
import { Amount } from 'components/Amount/Amount'

type AprTagProps = {
  percentage: string
}

export const AprTag = ({ percentage }: AprTagProps) => (
  <Tag colorScheme='green'>
    <Amount.Percent value={percentage} />
  </Tag>
)
