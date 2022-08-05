import './zendesk.css'

import { getConfig } from 'config'
import { useEffect } from 'react'

// https://support.zendesk.com/hc/en-us/articles/4500748175258
export const Zendesk = () => {
  const key = getConfig().REACT_APP_ZENDESK_KEY

  useEffect(() => {
    if (!key) return // key is not set for private, is set for app

    const scriptId = 'ze-snippet'
    const maybeScript = document.getElementById(scriptId)
    if (maybeScript) return // don't add multiple copies

    // const style = document.createElement('style')
    // style.id = 'launcher'
    // style.
    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${key}`
    document.head.appendChild(script)

    // setTimeout(() => {
    //   if ((window as any).zE) {
    //     ;(window as any).zE('webWidget', 'updateSettings', {
    //       webWidget: {
    //         launcher: {
    //           label: {
    //             '*': '\u200B', // zero-width space replacing 'Support' label
    //           },
    //         },
    //       },
    //     })
    //   }
    // }, 0)
  }, [key])

  return null
}
