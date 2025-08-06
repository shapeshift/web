import { LongPressEventType } from 'use-long-press'

export const defaultLongPressConfig = { detect: LongPressEventType.Touch, cancelOnMovement: 8 }

export const longPressSx = {
  // Only apply on touch devices (mobile/tablet)
  '@media (hover: none) and (pointer: coarse)': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
}
