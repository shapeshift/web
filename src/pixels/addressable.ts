import { getConfig } from '@/config'

const initAddressablePixel = (): void => {
  const cfg = getConfig()
  const enabled = cfg.VITE_ENABLE_ADDRESSABLE
  const tidRaw = cfg.VITE_ADDRESSABLE_TID
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
