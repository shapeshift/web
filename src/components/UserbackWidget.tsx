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
  console.log(
    'openUserbackWidget called, isReady:',
    isUserbackReady,
    'window.Userback:',
    window.Userback,
  )
  console.log('Userback methods:', window.Userback ? Object.keys(window.Userback) : 'none')

  if (isUserbackReady && window.Userback?.open) {
    window.Userback.open('general', 'form')
  } else {
    console.warn('Userback not yet initialized or open method not available')
  }
}

export const UserbackWidget: React.FC = () => {
  const userbackEnabled = import.meta.env.VITE_FEATURE_USERBACK === 'true'

  useEffect(() => {
    console.log('UserbackWidget useEffect, enabled:', userbackEnabled)
    if (!userbackEnabled) return

    const userbackToken = getConfig().VITE_USERBACK_TOKEN
    console.log('Userback token:', userbackToken ? 'present' : 'missing')

    if (!userbackToken) {
      console.warn('Userback token not configured')
      return
    }

    // Initialize Userback global object before loading script
    const userback: UserbackInstance = window.Userback ?? {}
    userback.access_token = userbackToken
    userback.on_load = () => {
      console.log('Userback on_load fired, widget ready!')
      console.log('Available methods:', Object.keys(window.Userback ?? {}))
      isUserbackReady = true
    }
    window.Userback = userback

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://static.userback.io/widget/v1.js?ubwc=Ude7rV5tYkLi59831-132981'
    script.onload = () => {
      console.log('Userback script element loaded')
    }
    script.onerror = e => {
      console.error('Failed to load Userback script:', e)
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
      isUserbackReady = false
    }
  }, [userbackEnabled])

  return null
}
