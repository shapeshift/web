declare global {
  interface Window {
    isShapeShiftMobile: true | undefined
    ReactNativeWebView?: {
      postMessage: (msg: string) => void
    }
  }
}

export const isMobile = Boolean(window.isShapeShiftMobile)
