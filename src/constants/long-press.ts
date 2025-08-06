import { LongPressEventType } from 'use-long-press'

export const defaultLongPressConfig = { detect: LongPressEventType.Touch, cancelOnMovement: 8 }

export const longPressSx = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  MozUserSelect: 'none',
  msUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
}
