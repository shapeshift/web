import './tooltip.css'

import { TextProps } from '@chakra-ui/react'
import DOMPurify, { sanitize } from 'dompurify'
import { RawText } from 'components/Text'

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  const el = node as HTMLElement
  if (data.tagName === 'a') {
    if (data.allowedTags['a']) {
      el.className = 'sanitized-link'
      const url: string = el.getAttribute('href') ?? ''
      const isExternalURL = new URL(url).origin !== window.location.origin
      if (isExternalURL) {
        el.setAttribute('target', '_blank')
      }
    } else {
      const span = document.createElement('span')
      const innerSpan = document.createElement('span')
      span.textContent = el.outerText
      span.className = 'sanitized-tooltip'
      innerSpan.textContent = 'Link removed for security'
      innerSpan.className = 'sanitized-tooltiptext'
      span.appendChild(innerSpan)
      el.replaceWith(span)
    }
  }
  return el
})

export const SanitizedHtml = ({
  dirtyHtml,
  isTrusted,
  ...rest
}: { dirtyHtml: string; isTrusted?: boolean } & TextProps) => {
  let cleanText = null
  if (isTrusted) {
    cleanText = sanitize(dirtyHtml ?? '', {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'a'],
      ADD_ATTR: ['target']
    })
  } else {
    cleanText = sanitize(dirtyHtml ?? '', {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span']
    })
  }
  return (
    <RawText
      {...rest}
      dangerouslySetInnerHTML={{
        __html: cleanText
      }}
    ></RawText>
  )
}
