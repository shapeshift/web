import './tooltip.css'

import type { TextProps } from '@chakra-ui/react'
import DOMPurify from 'dompurify'
import { useMemo } from 'react'

import { RawText } from '@/components/Text'

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  const el = node as HTMLElement
  if (data.tagName === 'a') {
    const span = document.createElement('span')
    const innerSpan = document.createElement('span')
    span.textContent = el.outerText
    span.className = 'sanitized-tooltip'
    innerSpan.textContent = 'Link removed for security'
    innerSpan.className = 'sanitized-tooltiptext'
    span.appendChild(innerSpan)
    el.replaceWith(span)
  }
  return el
})

export const SanitizedHtml = ({
  dirtyHtml,
  ...rest
}: { dirtyHtml: string; isTrusted?: boolean } & TextProps) => {
  const cleanText = DOMPurify.sanitize(dirtyHtml ?? '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span'],
  })
  const dangerouslySetInnerHTML = useMemo(
    () => ({
      __html: cleanText,
    }),
    [cleanText],
  )
  return <RawText {...rest} dangerouslySetInnerHTML={dangerouslySetInnerHTML}></RawText>
}
