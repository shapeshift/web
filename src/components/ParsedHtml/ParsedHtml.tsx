import './style.css'

import type { TextProps } from '@chakra-ui/react'
import { Link } from '@chakra-ui/react'
import type { HTMLReactParserOptions } from 'html-react-parser'
import parse, { domToReact, Element } from 'html-react-parser'
import { Link as RouterLink } from 'react-router-dom'
import { RawText } from 'components/Text'

const isExternalURL = (url: string) => {
  const tmp = document.createElement('a')
  tmp.href = url
  return tmp.host !== window.location.host
}

export const ParsedHtml = ({ innerHtml, ...rest }: { innerHtml: string } & TextProps) => {
  const options: HTMLReactParserOptions = {
    replace: domNode => {
      if (domNode instanceof Element && domNode.attribs) {
        const { href } = domNode.attribs
        if (domNode.name === 'a' && href) {
          return isExternalURL(href) ? (
            <Link isExternal href={href} className='parsed-link'>
              {domToReact(domNode.children)}
            </Link>
          ) : (
            <Link as={RouterLink} to={href} className='parsed-link'>
              {domToReact(domNode.children)}
            </Link>
          )
        }
      }
    },
  }

  return <RawText {...rest}>{parse(innerHtml, options)}</RawText>
}
