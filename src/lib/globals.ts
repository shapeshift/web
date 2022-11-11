declare global {
  interface Window {
    isShapeShiftMobile: true | undefined
    ReactNativeWebView?: {
      postMessage: (msg: string) => void
    }
  }
}

export const isMobile = Boolean(window.isShapeShiftMobile)

export const globalInit = { connected: false, initialized: false } as any
