const initAddressablePixel = (): void => {
  // Read from Vite's public env at build-time. These are statically injected.
  const enabledRaw = import.meta.env.VITE_ENABLE_ADDRESSABLE
  const tidRaw = import.meta.env.VITE_ADDRESSABLE_TID

  const enabled = String(enabledRaw).toLowerCase() === 'true'
  const tid = typeof tidRaw === 'string' ? tidRaw.trim() : ''

  if (!enabled || !tid) return

  const existingQueue = window.__adrsbl?.queue ?? []
  window.__adrsbl = {
    queue: existingQueue,
    run: (...args: unknown[]) => {
      try {
        const target = window.__adrsbl
        if (!target) return
        target.queue.push(args)
      } catch (_) {}
    },
  }

  const s = document.createElement('script')
  s.async = true
  s.referrerPolicy = 'no-referrer'
  s.src = 'https://tag.adrsbl.io/p.js?tid=' + encodeURIComponent(tid)
  s.onerror = () => {
    try {
      window.__adrsbl?.run('error', 'addressable:script_load_failed')
    } catch (_) {}
  }

  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(s, firstScript)
  } else if (document.head) {
    document.head.appendChild(s)
  } else {
    document.documentElement.appendChild(s)
  }
}

initAddressablePixel()
