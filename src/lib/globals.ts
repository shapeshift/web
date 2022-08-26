declare global {
  interface Window {
    isShapeShiftMobile: true | undefined
  }
}

export const isMobile = Boolean(window.isShapeShiftMobile)
