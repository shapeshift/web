import type { TextProps } from '@chakra-ui/react'
import { forwardRef, Text as CText } from '@chakra-ui/react'
import type Polyglot from 'node-polyglot'
import { useTranslate } from 'react-polyglot'

export type TextPropTypes = TextProps & {
  translation: string | null | [string, number | Polyglot.InterpolationOptions]
}

export const RawText = forwardRef<TextProps, 'p'>((props, ref) => {
  return <CText sx={{ fontFeatureSettings: `'zero' on, 'ss01' on` }} ref={ref} {...props} />
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
