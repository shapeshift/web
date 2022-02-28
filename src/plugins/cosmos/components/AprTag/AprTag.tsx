import { Tag, TagProps } from '@chakra-ui/tag'
import { Amount } from 'components/Amount/Amount'

type AprTagProps = {
  percentage: string
}

export const AprTag: React.FC<AprTagProps & TagProps> = ({ percentage, ...styleProps }) => (
  <Tag colorScheme='green' {...styleProps}>
    <Amount.Percent value={percentage} />
  </Tag>
)
