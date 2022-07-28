import { getConfig } from 'config'
import { useEffect } from 'react'

// https://support.zendesk.com/hc/en-us/articles/4500748175258
export const Zendesk = () => {
  const key = getConfig().REACT_APP_ZENDESK_KEY
  useEffect(() => {
    if (!key) return
    const script = document.createElement('script')
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${key}`
    script.id = 'ze-snippet'
    document.body.appendChild(script)
    if ((window as any).zE) {
      ;(window as any).zE('webWidget', 'updateSettings', {
        webWidget: {
          launcher: {
            label: {
              '*': '\u200B', // zero-width space replacing 'Support' label
            },
          },
        },
      })
    }
    return () => void document.body.removeChild(script)
  }, [key])

  return null
}
