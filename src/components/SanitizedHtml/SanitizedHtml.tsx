import './tooltip.css'

import { TextProps } from '@chakra-ui/react'
import DOMPurify, { sanitize } from 'dompurify'
import { RawText } from 'components/Text'

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  const el = node as HTMLElement
  if (data.tagName === 'a') {
    el.className = 'sanitized-tooltip'
    const url : string = el.getAttribute('href') ?? ''
    const isExternalURL = new URL(url).origin !== location.origin;
    if(isExternalURL){
      el.setAttribute('target', '_blank');
    }
  }
  return el
})

export const SanitizedHtml = ({ dirtyHtml, ...rest }: { dirtyHtml: string } & TextProps) => {
  const cleanText = sanitize(dirtyHtml ?? '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span','a'],
    ADD_ATTR: ["target"]
  })

  return (
    <RawText
      {...rest}
      dangerouslySetInnerHTML={{
        __html: cleanText
      }}
    ></RawText>
  )
}
