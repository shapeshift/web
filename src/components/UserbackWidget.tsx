import type React from 'react'
import { useEffect } from 'react'

import { getConfig } from '@/config'

type UserbackInstance = {
  access_token?: string
  on_load?: () => void
  open?: (feedbackType?: string, destination?: string) => void
  show?: () => void
  hide?: () => void
}

declare global {
  interface Window {
    Userback?: UserbackInstance
  }
}

let isUserbackReady = false

export const openUserbackWidget = (): void => {
  if (isUserbackReady && window.Userback?.open) {
    window.Userback.open('general', 'form')
  }
}

export const UserbackWidget: React.FC = () => {
  const userbackEnabled = import.meta.env.VITE_FEATURE_USERBACK === 'true'

  useEffect(() => {
    if (!userbackEnabled) return

    const userbackToken = getConfig().VITE_USERBACK_TOKEN

    if (!userbackToken) return

    const userback: UserbackInstance = window.Userback ?? {}
    userback.access_token = userbackToken
    userback.on_load = () => {
      isUserbackReady = true
    }
    window.Userback = userback

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://static.userback.io/widget/v1.js?ubwc=Ude7rV5tYkLi59831-132981'
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
      isUserbackReady = false
    }
  }, [userbackEnabled])

  return null
}
