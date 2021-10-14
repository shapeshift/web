import { forwardRef, Text as CText, TextProps } from '@chakra-ui/react'
import Polyglot from 'node-polyglot'
import { useTranslate } from 'react-polyglot'

export type TextPropTypes = TextProps & {
  translation: string | null | [string, number | Polyglot.InterpolationOptions]
}

export const RawText = forwardRef<TextProps, 'p'>((props, ref) => {
  return <CText ref={ref} {...props} />
})

export const Text = forwardRef<TextPropTypes, 'p'>((props, ref) => {
  const translate = useTranslate()

  if (Array.isArray(props.translation)) {
    return (
      <CText {...props} ref={ref}>
        {translate(...props.translation)}
      </CText>
    )
  }

  return (
    <CText {...props} ref={ref}>
      {translate(props.translation)}
    </CText>
  )
})

export const ErrorText = forwardRef<TextPropTypes, 'p'>((props, ref) => {
  return <Text color='red' fontWeight='bold' py={2} {...props} ref={ref} />
})
