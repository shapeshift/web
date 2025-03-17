import type { TextProps } from '@chakra-ui/react'
import { forwardRef, Text as CText } from '@chakra-ui/react'
import type Polyglot from 'node-polyglot'
import { Fragment, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

export type TextPropTypes = TextProps & {
  translation: string | null | [string, number | Polyglot.InterpolationOptions]
}

const cTextStyle = { fontFeatureSettings: `'zero' on, 'ss01' on` }

export const RawText = forwardRef<TextProps, 'p'>((props, ref) => {
  return <CText sx={cTextStyle} ref={ref} {...props} />
})

const ALLOWED_TAGS: Record<string, React.ElementType> = {
  span: 'span',
}

const parseTextWithTags = (text: string): JSX.Element[] => {
  const parts: JSX.Element[] = []
  let currentIndex = 0
  let key = 0

  const tagRegex = /\[(\/?\w+)\]/g
  const tagStack: { tag: string; startIndex: number }[] = []

  text.replace(tagRegex, (match, tag: string, index: number) => {
    if (!tag.startsWith('/')) {
      if (ALLOWED_TAGS[tag]) {
        if (index > currentIndex) {
          parts.push(<Fragment key={key++}>{text.slice(currentIndex, index)}</Fragment>)
        }
        tagStack.push({ tag, startIndex: index + match.length })
      }
    } else {
      const openTag = tag.slice(1)
      const lastTag = tagStack[tagStack.length - 1]

      if (lastTag && lastTag.tag === openTag && ALLOWED_TAGS[openTag]) {
        const content = text.slice(lastTag.startIndex, index)
        const TagComponent = ALLOWED_TAGS[openTag]

        parts.push(<TagComponent key={key++}>{content}</TagComponent>)
        tagStack.pop()
        currentIndex = index + match.length
      }
    }
    return match
  })

  if (currentIndex < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(currentIndex)}</Fragment>)
  }

  return parts
}

export const Text = forwardRef<TextPropTypes, 'p'>((props, ref) => {
  const translate = useTranslate()
  const { translation, ...rest } = props

  const content = useMemo(() => {
    const translatedText = Array.isArray(translation)
      ? translate(...translation)
      : translate(translation)

    return parseTextWithTags(translatedText)
  }, [translation, translate])

  return (
    <CText {...rest} ref={ref}>
      {content}
    </CText>
  )
})
