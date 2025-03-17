import type { ReactElement } from 'react'
import React from 'react'
import { useTranslate } from 'react-polyglot'

interface StyledTranslationProps {
  i18nKey: string
  components?: Record<string, ReactElement>
  values?: Record<string, string | number>
}

export const StyledTranslation = ({
  i18nKey,
  components,
  values = {},
}: StyledTranslationProps): ReactElement => {
  const t = useTranslate()
  const translatedText = t(i18nKey, values)

  if (!components) {
    // Always return a valid JSX element
    return <React.Fragment>{translatedText}</React.Fragment>
  }

  const parts = translatedText.split(/(%\{[^}]+\})/g)

  return (
    <>
      {parts.map((part: string, index: string) => {
        const match = part.match(/%\{([^}]+)\}/)
        if (match) {
          const key = match[1]
          return components[key] ? (
            React.cloneElement(components[key], { key: index })
          ) : (
            <span key={index}>{part}</span>
          )
        }
        return <React.Fragment key={index}>{part}</React.Fragment>
      })}
    </>
  )
}
