import { LongPressEventType } from 'use-long-press'

export const defaultLongPressConfig = { detect: LongPressEventType.Touch, cancelOnMovement: 8 }

export const longPressSx = {
  '@media (hover: none) and (pointer: coarse)': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
}

// Prevents annoying long press image behavior
export const imageLongPressSx = {
  '@media (hover: none) and (pointer: coarse)': {
    img: {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent',

      // Prevent drag behavior on the image element
      WebkitUserDrag: 'none',
      KhtmlUserDrag: 'none',
      MozUserDrag: 'none',
      OUserDrag: 'none',
      userDrag: 'none',

      // Additional prevention
      draggable: false,
    },
  },
}
