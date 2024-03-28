import type { TextProps } from '@chakra-ui/react'
import { RawText } from 'components/Text'

export const DialogTitle: React.FC<TextProps> = props => (
  <RawText textAlign='center' fontWeight='semibold' {...props} />
)
