const initHypeLabPixel = (): void => {
  const enabledRaw = import.meta.env.VITE_ENABLE_HYPELAB
  const propertySlug = import.meta.env.VITE_HYPELAB_PROPERTY_SLUG

  const enabled = String(enabledRaw).toLowerCase() === 'true'
  if (!enabled || !propertySlug) return

  // Initialize global HypeLab objects
  window.__hype_analytics = []
  window.__hype_wids = []
  window.HypeLabAnalytics = {
    logEvent: (...args: unknown[]) => {
      window.__hype_analytics?.push(args)
    },
    setWalletAddresses: (w: string[]) => {
      window.__hype_wids = w
    },
  }

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://api.hypelab.com/v1/scripts/ha-sdk.js?v=0'
  script.onload = () => {
    const config = {
      environment: 'production',
      propertySlug,
      privacy: { trackAllSessions: true },
    }
    if (window.HypeLabAnalytics?.Client) {
      window.HypeLabAnalytics.setClient?.(new window.HypeLabAnalytics.Client(config))
    }
  }
  script.onerror = () => {
    console.error('Failed to load HypeLab analytics script')
  }

  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
  } else if (document.head) {
    document.head.appendChild(script)
  } else {
    document.documentElement.appendChild(script)
  }
}

initHypeLabPixel()
