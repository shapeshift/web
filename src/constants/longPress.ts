import { LongPressEventType } from 'use-long-press'

export const defaultLongPressConfig = { detect: LongPressEventType.Touch, cancelOnMovement: 8 }

// These styles primarily prevent things like mobile highlight behaviours to allow for long press
const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent)
const isAndroid = typeof window !== 'undefined' && /Android/.test(window.navigator.userAgent)

export const longPressSx = {
  // Apply universally first in case media query doesn't work
  ...(isIOS || isAndroid
    ? {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }
    : {}),

  '@media (hover: none) and (pointer: coarse)': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
}
