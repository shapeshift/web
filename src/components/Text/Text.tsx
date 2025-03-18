import type { TextProps } from '@chakra-ui/react'
import { Box, forwardRef, Text as CText } from '@chakra-ui/react'
import type Polyglot from 'node-polyglot'
import type { ReactElement } from 'react'
import { cloneElement, Fragment, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

export type TextPropTypes = TextProps & {
  translation: string | null | [string, number | Polyglot.InterpolationOptions]
  components?: Record<string, ReactElement>
}

const cTextStyle = { fontFeatureSettings: `'zero' on, 'ss01' on` }

export const RawText = forwardRef<TextProps, 'p'>((props, ref) => {
  return <CText sx={cTextStyle} ref={ref} {...props} />
})

export const Text = forwardRef<TextPropTypes, 'p'>(({ components, translation, ...props }, ref) => {
  const translate = useTranslate()

  const maybeElements = useMemo(() => {
    if (!translation) return null

    if (Array.isArray(translation) && !components) {
      return (
        <CText {...props} ref={ref}>
          {translate(...translation)}
        </CText>
      )
    }

    if (typeof translation === 'string' && !components) {
      return (
        <CText {...props} ref={ref}>
          {translate(translation)}
        </CText>
      )
    }

    const translatedText = translate(translation)

    const translationPlaceholders = translatedText.split(/(%\{[^}]+\})/g)

    return (
      <Box ref={ref} {...props}>
        {translationPlaceholders?.map((part: string | undefined, index: number) => {
          if (!part) return null

          const match = part.match(/%\{([^}]+)\}/)

          if (match) {
            const key = match[1]
            return components?.[key] ? (
              cloneElement(components[key], { key: index })
            ) : (
              <span key={index}>{part}</span>
            )
          }
          return <Fragment key={index}>{part}</Fragment>
        })}
      </Box>
    )
  }, [components, props, ref, translate, translation])

  return maybeElements
})
