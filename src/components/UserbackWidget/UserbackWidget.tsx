import type React from 'react'
import { useEffect, useRef } from 'react'

import type { UserbackInstance } from '@/components/UserbackWidget/types'
import { getConfig } from '@/config'

const USERBACK_SCRIPT_SRC = 'https://static.userback.io/widget/v1.js?ubwc=Ude7rV5tYkLi59831-132981'

let isUserbackReady = false

export const openUserbackWidget = () => {
  if (isUserbackReady && window.Userback?.open) {
    window.Userback.open('general', 'form')
  }
}

export const UserbackWidget: React.FC = () => {
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    const userbackEnabled = getConfig().VITE_FEATURE_USERBACK
    const userbackToken = getConfig().VITE_USERBACK_TOKEN

    if (!userbackEnabled || !userbackToken) return

    if (scriptRef.current) return

    const script = document.createElement('script')
    script.async = true
    script.src = USERBACK_SCRIPT_SRC
    scriptRef.current = script

    const userback: UserbackInstance = window.Userback ?? {}
    userback.access_token = userbackToken
    userback.on_load = () => {
      isUserbackReady = true
    }
    window.Userback = userback

    document.body.appendChild(script)

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current)
      }
      scriptRef.current = null
      isUserbackReady = false
      window.Userback = undefined
    }
  }, [])

  return null
}
