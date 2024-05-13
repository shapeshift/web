declare global {
  interface Window {
    isShapeShiftMobile: true | undefined
    ReactNativeWebView?: {
      postMessage: (msg: string) => void
    }
  }
  interface String {
    split<Separator extends string | RegExp, Limit extends number>(
      separator: Separator,
      limit?: Limit,
    ): (string | undefined)[]
  }
}

export const isMobile = Boolean(window?.isShapeShiftMobile)
