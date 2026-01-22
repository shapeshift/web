import Userback from '@userback/widget'
import type React from 'react'
import { useEffect } from 'react'

import { getConfig } from '@/config'

let userbackInstance: Awaited<ReturnType<typeof Userback>> | null = null

export const getUserbackInstance = (): Awaited<ReturnType<typeof Userback>> | null => {
  return userbackInstance
}

export const UserbackWidget: React.FC = () => {
  const userbackEnabled = import.meta.env.VITE_FEATURE_USERBACK === 'true'

  useEffect(() => {
    if (!userbackEnabled) return

    const userbackToken = getConfig().VITE_USERBACK_TOKEN

    if (!userbackToken) {
      console.warn('Userback token not configured')
      return
    }

    const initUserback = async () => {
      try {
        userbackInstance = await Userback(userbackToken, {
          widget_settings: {
            trigger_type: 'api',
          },
          autohide: true,
        })
      } catch (error) {
        console.error('Failed to initialize Userback:', error)
      }
    }

    initUserback()
  }, [userbackEnabled])

  return null
}
