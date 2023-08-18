import type { TextProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'

import { RawText } from './Text'

const after = {
  content: 'attr(title)',
  overflow: 'hidden',
  height: 0,
  display: 'block',
}

type AutoTruncateTextProps = {
  value?: string
} & TextProps
export const AutoTruncateText: React.FC<AutoTruncateTextProps> = ({ value, ...rest }) => {
  return (
    <Box
      position='relative'
      overflow='hidden'
      height='20px'
      width='full'
      title={value}
      _after={after}
    >
      <RawText
        fontWeight='medium'
        as='span'
        position='absolute'
        lineHeight='shorter'
        noOfLines={1}
        display='block'
        maxWidth='100%'
        {...rest}
      >
        {value}
      </RawText>
    </Box>
  )
}
