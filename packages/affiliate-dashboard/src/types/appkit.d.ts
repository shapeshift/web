import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

export {}
